import os
import subprocess
import random
import shutil
import unicodedata

mapbox_dir = '/Users/kimkyoungran/Downloads/mapbox'
audio_dir = os.path.join(mapbox_dir, 'audio')

# List ALL files and normalize names (macOS uses NFD, Python prefers NFC)
all_files = os.listdir(mapbox_dir)
print("All files in mapbox dir (raw):")
for f in all_files:
    nf = unicodedata.normalize('NFC', f)
    if nf.endswith('.mov') or nf.endswith('.wav'):
        print(f"  [{f}]")

mov_files = sorted([
    f for f in all_files
    if unicodedata.normalize('NFC', f).endswith('.mov')
])
wav_files = [
    f for f in all_files
    if unicodedata.normalize('NFC', f).endswith('.wav')
]

print(f"\nFound {len(mov_files)} MOV files and {len(wav_files)} WAV files")

source_audio = []

# Convert each MOV -> m4a using avconvert
for i, mov in enumerate(sorted(mov_files)):
    src = os.path.join(mapbox_dir, mov)
    out_name = f'bell_{i+1}.m4a'
    out_path = os.path.join(audio_dir, out_name)
    nf_mov = unicodedata.normalize('NFC', mov)
    print(f"\nConverting: {nf_mov} -> {out_name}")
    result = subprocess.run([
        'avconvert',
        '--preset', 'PresetAppleM4A',
        '--source', src,
        '--output', out_path,
        '--replace'
    ], capture_output=True, text=True)
    if result.returncode == 0:
        size = os.path.getsize(out_path) if os.path.exists(out_path) else 0
        print(f"  OK ({size} bytes): {out_name}")
        if size > 1000:
            source_audio.append(out_name)
        else:
            print(f"  WARNING: Output too small, skipping")
    else:
        print(f"  ERROR: {result.stderr.strip()}")

# Copy WAV files
for j, wav in enumerate(wav_files):
    src = os.path.join(mapbox_dir, wav)
    out_name = f'bell_{len(source_audio)+j+1}.wav'
    out_path = os.path.join(audio_dir, out_name)
    shutil.copy2(src, out_path)
    print(f"\nCopied WAV: {unicodedata.normalize('NFC', wav)} -> {out_name}")
    source_audio.append(out_name)

print(f"\n--- Total usable audio files: {len(source_audio)} ---")
for a in source_audio:
    print(f"  {a}")

# 9 countries (excluding south_korea)
countries = [
    ('japan', '일본', 'Japan'),
    ('nepal', '네팔', 'Nepal'),
    ('sri_lanka', '스리랑카', 'Sri Lanka'),
    ('india', '인도', 'India'),
    ('afghanistan', '아프가니스탄', 'Afghanistan'),
    ('laos', '라오스', 'Laos'),
    ('thailand', '태국', 'Thailand'),
    ('hong_kong', '홍콩', 'Hong Kong'),
    ('spain', '스페인', 'Spain'),
]

random.seed()
shuffled = source_audio[:]
random.shuffle(shuffled)

print("\n=== 랜덤 배정 결과 ===")
assignments = {}
for i, (key, ko, en) in enumerate(countries):
    audio_file = shuffled[i % len(shuffled)]
    assignments[key] = [audio_file, ko, en]
    print(f"  {ko} ({en}): audio/{audio_file}")

import json
with open(os.path.join(mapbox_dir, 'audio_assignments.json'), 'w', encoding='utf-8') as f:
    json.dump(assignments, f, ensure_ascii=False, indent=2)
print("\nSaved to audio_assignments.json")
