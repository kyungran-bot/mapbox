console.log("app.js: top-level script execution started!");
// Mapbox credentials and access token
mapboxgl.accessToken = 'pk.eyJ1Ijoia2ltcmFuIiwiYSI6ImNtb3Y1MW80cTAzYnMycG9vODViYTA0MGEifQ.2LUwqbZUGIn6My2VcJZ-7g';

let map = null;
try {
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/kimran/cmpovsnnb001801ssg9s28b1k',
    center: [126.9780, 37.5665], // Center coordinate (Korea)
    zoom: 2.5 // Zoom level starting global but visible
  });
} catch (e) {
  console.error("Mapbox GL JS map initialization failed:", e);
}

// Global variables for active layer management
let activeLayerId = 'bell-time'; // Updated default layer ID to match new Mapbox Layer ID!
let clickHandler = null;
let mouseEnterHandler = null;
let mouseLeaveHandler = null;
let hasAutoFocused = false; // Flag to prevent repeated auto-zooming on user interaction
let readyToAutoFocus = false; // Only true after the intro overlay is dismissed
let activePopup = null; // Store reference to close popups programmatically

// Audio Management State
let activeAudio = null;
let activeAudioTempleId = null;
let isManuallyPlaying = false; // Tracks if sound was manually played by clicking "Play Bell Sound"

// Mapping temple IDs or countries to their respective audio files in audio/ folder
const templeAudioMap = {
  // Mapping by ID
  '9':  'audio/south_korea.mp3',   // 대한민국 (조계사)
  '11': 'audio/kalsstockmedia-church-temple-bell-gong-dong-sound-effect-3-241681.mp3', // 일본
  '19': 'audio/freesound_community-temple-bells-74677.mp3', // 네팔
  '28': 'audio/freesound_community-temple-chiming-bowl-singing-bowl-72080.mp3', // 스리랑카
  '29': 'audio/freesound_community-indian-temple-bell-68150.mp3', // 인도
  '32': 'audio/freesound_community-temple-chanting-interior-52687.mp3', // 아프가니스탄
  '33': 'audio/freesound_community-008978_chanting-people-in-indian-hindu-temple-49126.mp3', // 라오스
  '38': 'audio/freesound_community-astri-sound-bit-012-suspence-temple-trumpet-humms-22661.mp3', // 태국
  '41': 'audio/bell_mixkit.wav', // 홍콩 (보린사)
  '49': 'audio/kalsstockmedia-log-soft-low-frequency-bell-sound-temple-asmr-309725.mp3', // 스페인

  // Fallback mappings by country name
  '대한민국': 'audio/south_korea.mp3',
  'South Korea': 'audio/south_korea.mp3',
  '일본': 'audio/kalsstockmedia-church-temple-bell-gong-dong-sound-effect-3-241681.mp3',
  'Japan': 'audio/kalsstockmedia-church-temple-bell-gong-dong-sound-effect-3-241681.mp3',
  '네팔': 'audio/freesound_community-temple-bells-74677.mp3',
  'Nepal': 'audio/freesound_community-temple-bells-74677.mp3',
  '스리랑카': 'audio/freesound_community-temple-chiming-bowl-singing-bowl-72080.mp3',
  'Sri Lanka': 'audio/freesound_community-temple-chiming-bowl-singing-bowl-72080.mp3',
  '인도': 'audio/freesound_community-indian-temple-bell-68150.mp3',
  'India': 'audio/freesound_community-indian-temple-bell-68150.mp3',
  '아프가니스탄': 'audio/freesound_community-temple-chanting-interior-52687.mp3',
  'Afghanistan': 'audio/freesound_community-temple-chanting-interior-52687.mp3',
  '라오스': 'audio/freesound_community-008978_chanting-people-in-indian-hindu-temple-49126.mp3',
  'Laos': 'audio/freesound_community-008978_chanting-people-in-indian-hindu-temple-49126.mp3',
  '태국': 'audio/freesound_community-astri-sound-bit-012-suspence-temple-trumpet-humms-22661.mp3',
  'Thailand': 'audio/freesound_community-astri-sound-bit-012-suspence-temple-trumpet-humms-22661.mp3',
  '홍콩': 'audio/bell_mixkit.wav',
  'Hong Kong': 'audio/bell_mixkit.wav',
  '스페인': 'audio/kalsstockmedia-log-soft-low-frequency-bell-sound-temple-asmr-309725.mp3',
  'Spain': 'audio/kalsstockmedia-log-soft-low-frequency-bell-sound-temple-asmr-309725.mp3'
};

// Global Audio Toggle function
function toggleAudio(audioUrl, buttonEl, templeIdOrCountry) {
  // If there's an active audio playing, and it's a different one, stop it first
  if (activeAudio && activeAudioTempleId !== templeIdOrCountry) {
    stopCurrentAudio();
  }

  if (activeAudio && activeAudioTempleId === templeIdOrCountry) {
    // Toggling the same audio
    if (activeAudio.paused) {
      isManuallyPlaying = true;
      activeAudio.play().then(() => {
        buttonEl.classList.add('playing');
        buttonEl.innerHTML = '⏸️ 타종 중 (Stop Bell Sound)';
      }).catch(err => {
        console.error('Audio play failed:', err);
      });
    } else {
      stopCurrentAudio();
    }
  } else {
    // Create new audio instance
    activeAudio = new Audio(audioUrl);
    activeAudioTempleId = templeIdOrCountry;
    isManuallyPlaying = true;

    // Add event listener to reset button when audio ends
    activeAudio.addEventListener('ended', () => {
      buttonEl.classList.remove('playing');
      buttonEl.innerHTML = 'Play Bell Sound';
      activeAudio = null;
      activeAudioTempleId = null;
      isManuallyPlaying = false;
    });

    activeAudio.play().then(() => {
      buttonEl.classList.add('playing');
      buttonEl.innerHTML = '⏸️ 타종 중 (Stop Bell Sound)';
    }).catch(err => {
      console.error('Audio play failed:', err);
      alert('오디오를 재생할 수 없습니다. 브라우저 보안 설정을 확인하시거나 사용자 상호작용 후 재생을 시도해주세요.');
    });
  }
}

// Function to stop current audio
function stopCurrentAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
    activeAudioTempleId = null;
  }
  isManuallyPlaying = false;
  // Reset all play buttons on the page
  const playBtns = document.querySelectorAll('.audio-play-btn');
  playBtns.forEach(btn => {
    btn.classList.remove('playing');
    btn.innerHTML = 'Play Bell Sound';
  });
}

// Auto-play sound automatically (such as on hover or focus)
function playAudioAutomatically(audioUrl, templeIdOrCountry) {
  if (activeAudio && activeAudioTempleId === templeIdOrCountry) {
    return;
  }
  if (activeAudio) {
    stopCurrentAudio();
  }

  activeAudio = new Audio(audioUrl);
  activeAudioTempleId = templeIdOrCountry;
  isManuallyPlaying = false;

  const audioBtn = document.getElementById('audio-toggle-btn');
  const currentCardKey = detailCard.dataset.templeKey;

  activeAudio.addEventListener('ended', () => {
    if (audioBtn && currentCardKey === templeIdOrCountry.toString()) {
      audioBtn.classList.remove('playing');
      audioBtn.innerHTML = 'Play Bell Sound';
    }
    activeAudio = null;
    activeAudioTempleId = null;
    isManuallyPlaying = false;
  });

  activeAudio.play().then(() => {
    if (audioBtn && currentCardKey === templeIdOrCountry.toString()) {
      audioBtn.classList.add('playing');
      audioBtn.innerHTML = '⏸️ 타종 중 (Stop Bell Sound)';
    }
  }).catch(err => {
    console.error('Auto play failed:', err);
  });
}


// ─────────────────────────────────────────────────────────
// Intro Overlay + Background Audio on First Interaction
// ─────────────────────────────────────────────────────────
(function setupIntroOverlay() {
  console.log("app.js: setupIntroOverlay IIFE running!");
  const overlay = document.getElementById('intro-overlay');
  const enterBtn = document.getElementById('intro-enter-btn');
  const bgAudioEl = document.getElementById('bg-audio');

  if (!overlay || !enterBtn) return;

  function dismissAndPlay() {
    console.log("app.js: dismissAndPlay triggered!");
    // Dismiss overlay with fade
    overlay.classList.add('hidden');

    // Play the background screen recording audio
    if (bgAudioEl) {
      try {
        const playPromise = bgAudioEl.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn("Background audio play failed:", err);
          });
        }
      } catch (e) {
        console.warn("Background audio play error:", e);
      }
    }

    // Now trigger the auto-focus to the closest temple
    triggerAutoFocus();
  }

  enterBtn.addEventListener('click', dismissAndPlay);
})();


const layerSelect = document.getElementById('layer-select');
const publishAlert = document.getElementById('publish-alert');
const settingsTrigger = document.getElementById('settings-trigger');
const settingsPanel = document.getElementById('settings-panel');
const detailCard = document.getElementById('temple-detail-card');
const detailContent = document.getElementById('temple-detail-content');
const closeCardBtn = document.getElementById('close-card-btn');

// Live Clock DOM Elements
const clockTime = document.getElementById('clock-time');
const clockStatus = document.getElementById('clock-status');

// 1. Real-Time KST Clock Updater
function updateKstClock() {
  const now = new Date();
  // Get time formatted to KST (Asia/Seoul)
  const timeString = now.toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  clockTime.textContent = timeString + ' KST';
}
setInterval(updateKstClock, 1000);
updateKstClock(); // Initial fire

// Toggle settings panel
settingsTrigger.addEventListener('click', () => {
  settingsPanel.classList.toggle('active');
});

// Close detail card
closeCardBtn.addEventListener('click', () => {
  detailCard.classList.remove('active');
  stopCurrentAudio();
});

// Hide detail card on map click in empty spaces
if (map) {
  map.on('click', (e) => {
    setTimeout(() => {
      if (!map) return;
      const features = map.queryRenderedFeatures(e.point);
      const hitTargetLayer = features.some(f => f.layer.id === activeLayerId || f.layer.id === 'bell-time-sound-bell');
      if (!hitTargetLayer) {
        detailCard.classList.remove('active');
        stopCurrentAudio();
      }
    }, 50);
  });
}

let _buddhaImg = null; // Module-level reference to prevent GC before onload fires

const initLayersAndIcons = () => {
  console.log("initLayersAndIcons execution started! Map exists:", !!map, "Style loaded:", map ? map.isStyleLoaded() : false);
  if (!map) return;
  // Load green Buddha image
  const greenBuddhaSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzQiIGhlaWdodD0iNDUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDMzNS40NSA0NDcuNTYiPjxwYXRoIGZpbGw9IiMxZmZmOWUiIGQ9Ik0zMzMuNzEsMzg0LjZjLTQuNTMtMTEuMTktMTQuNi0xOC40LTI0LjQ4LTI0LjE2LTQuNDItMy4yOC02LjExLTkuMDktMTAuOTctMTIuMTgtNC4zOC00LjMtMTEuMjUtNi4zMi0xNS44Ny0xMC4zLTExLjM0LTE0LjEzLDMuOTctMjkuMTQsNC4yLTQ0LjU1LS41OS05LjgzLTguNDItMjMuNTctMTAuNzEtMzEuNjctMy40MS0xNS41Mi01Ljg1LTMyLjEyLTguOTgtNDcuOTMtMi42OS0xMy4xOS02LjMyLTI3LjUyLTE3Ljk5LTM1LjczLTE2LjA1LTEzLjYtNDAuNDQtMTcuMzItNTcuNTYtMjguMTgtLjU2LS44OS0uNTUtMS45OS0uNTktMy4wNC4zMi00LjQ3LTEuMTEtOS4yOSwxLjczLTEyLjkxLDIuMzgtMi40Myw3LjU3LTExLjg5LDkuNDgtMTEuMjcsNC4xNSw1LjI1LTQuMjMsMTcuODIsNS45MSwxOC40Myw5LjI5LTMuNjEsMi4xMy0yMC42MiwzLjUyLTI4LjQ4LjUxLTkuNzcsMTEuODYtMjIuMDMsNy4zNy0zMS4yMi0yLjg2LTIuOC01LjczLTMuNy01LTguMjIuMDYtNC43Mi0uMy0xMC4xNy4yNi0xNC43Ljc5LTQuMDYtMS4yLTcuMzEtNC42Ny05LjI1LS41Ny0yLjUxLjUxLTYuMTktNC41MS02LjQ0LTIuMzMtMS4wNy42OC0zLjg4LTMuMDMtNS4yNC0xLjM5LS41Mi0zLjA3LS4wOS0zLjY1LS41LTEuMDktMS4yNy4xNC00LjA3LTEuNC01LjYxLTEuMzYtMS45Ni00LjgxLS45LTYuMjctMi0yLjAxLTQuMjIsMy4xNC01LjY3LS4zLTExLjMzLS41Ni0yLjg5LTIuODYtNC41My01LjA5LTYuMTUtLjk3LTEuMDgtMS4zMy0zLjAxLTIuNjUtMy45My0uODctLjY2LTIuMDMtLjcyLTMuMDUtLjk4LTIuNTktMS4yMy00LjMxLTQuNTMtNi44Mi02LjEzLTUuNjctMi4wMy05Ljk3LS44LTEzLjc5LDMuOTEtMS4zNCwyLjUyLTMuNTksMi4wMy01LjY2LDMuMi0xLjMyLjkyLTEuNjgsMi44NS0yLjY1LDMuOTMtLjg0LDEuMDctMi40OCwxLjUzLTMuNDYsMi42OC0xLjM2LDIuNTQtMyw1LjM5LTIuNzcsOC40Mi4yMSwxLjg1LDIuNiw0Ljg5Ljc0LDYuNDUtMS45LDEtNi4wMS0uMDQtNi44LDMuMDUtLjY2LDEuNTkuMjIsMy41NS0uNzcsNC40OS00LjEyLjYyLTUuNzktLjAyLTUuOTEsNS4zMy0zLjc1LDEuMzItNS40NywxLjM2LTUuMDYsNi4wMy0uMDIuMjktLjA3LjU3LS4yMi44MS02LjM5LDMuNDktNC40OCw4LjI0LTQuMzYsMTQuNTktLjI3LDQuMy41NSw5LjMtLjUyLDEzLjM5LS44NCwxLjgtMy44NCwyLjYxLTQuOSw0Ljc2LTMuMTgsOC45NCw2LDE5Ljc2LDcuNDYsMjguNjksMS40MSw4LjUxLTIuMTMsMTcuNC0uNDMsMjUuODQsMS4wM2wtNC43NCw2LjI3LDYuMjYsOC44MywyLjA5LDIuNTQtNC42MS0yLjE0LTExLjM4LDEuMzEtMTUuOTMsMS42Mi0xLjAxLDcuNTEsOS4zOCw5LjU4LDExLjQyLDIuNzQsNC4wOSwxLjY0LDEwLjQzLDEuMywxNS4yOS0yMi4zMSwxNS40Ny02Mi4yNSwxNy40Mi03MS40OCw0OC4xOC02LjY5LDIwLjc4LTguNCw0My4xNi0xMy4zLDY0LjE3LTE0LjcxLDM4LjQ5LTEyLjkxLDI0LjM1LTIuMjgsNjIuNTUuNzUsMTUuNzYtMTAuNjMsMTYuMDQtMjAuMDksMjMuOTYtNC43NCwzLjAzLTYuNSw4LjY0LTEwLjcsMTItOS4zMiw1LjQ5LTE5LjMzLDEyLjM0LTIzLjk5LDIyLjctMTMuNSw0MS4zOSwyNi43Myw1Ni45Niw2MS4xNiw1NS44LDEzLjY3LDEsMjguMjYtNS4xNCw0MS4yOS00LjcxLDQuOTUsMy4zMSwxMC41OCw1LjE5LDE2LjU2LDYuMTksMy40MSw4Ni0xLjAxLDYuNDksMy4zLDYuODMsOS4zNSwxMSwzMy4zNiw1NSw0Ny4zMyw0OSwxNC45NS0xLjA2LDMyLjk1LDEuMzctNDAuMTItMS41MiwxLjA5LTEuODQtMS4yNS01LjA0LDEuMzctNS43NSw0LjUtMS4wNSw5LjQyLTEuODIsMTMuMjgtNC4yNCwxLjk2LTEuMDcsMy45NS0yLjg5LDYuMy0yLjQyLDM4LjIsOS45NywxMTQuMzMsOS42LDEwMC4zOC00OC44N2wtLjA2LS4xNVoiLz48L3N2Zz4=';

  // Use canvas approach: map.loadImage does NOT support SVG in Mapbox GL JS v2
  _buddhaImg = new Image();
  _buddhaImg.onload = () => {
    console.log("Buddha SVG loaded via canvas approach!");
    if (!map) return;

    const canvas = document.createElement('canvas');
    canvas.width = 34;
    canvas.height = 45;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(_buddhaImg, 0, 0, 34, 45);

    if (!map.getImage('green-buddha-icon')) {
      map.addImage('green-buddha-icon', canvas);
    }

    const soundIds = [9, 11, 19, 28, 29, 32, 33, 38, 41, 49];
    const soundIdsStr = ['9', '11', '19', '28', '29', '32', '33', '38', '41', '49'];

    // Add symbol layer for temples with direct audio (부처 아이콘으로 표시)
    if (!map.getLayer('bell-time-sound-bell')) {
      map.addLayer({
        'id': 'bell-time-sound-bell',
        'type': 'symbol',
        'source': 'composite',
        'source-layer': 'bell-time',
        'layout': {
          'icon-image': 'green-buddha-icon',
          'icon-size': 0.65,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        },
        'filter': [
          'any',
          ['match', ['to-number', ['coalesce', ['get', 'id'], -1]], soundIds, true, false],
          ['match', ['coalesce', ['get', 'id'], ''], soundIdsStr, true, false],
          ['match', ['id'], soundIds, true, false]
        ]
      });

      // Hide original circles for sound countries (show Buddha icon instead)
      map.setFilter('bell-time', [
        'all',
        ['!', ['match', ['to-number', ['coalesce', ['get', 'id'], -1]], soundIds, true, false]],
        ['!', ['match', ['coalesce', ['get', 'id'], ''], soundIdsStr, true, false]],
        ['!', ['match', ['id'], soundIds, true, false]]
      ]);

      bindInteractiveEvents(activeLayerId);
    }
  };
  _buddhaImg.onerror = (e) => console.error('Buddha SVG load error:', e);
  _buddhaImg.src = greenBuddhaSvg;

  // Scan Mapbox Style layers dynamically
  const allLayers = map.getStyle().layers || [];
  populateLayerSelector(allLayers);
};

if (map) {
  if (map.isStyleLoaded()) {
    initLayersAndIcons();
  } else {
    map.on('load', initLayersAndIcons);
  }
}

// 2. Auto-focus closest temple once layers are loaded/idle
if (map) {
  map.on('idle', () => {
    if (readyToAutoFocus && !hasAutoFocused && map) {
      try {
        const layersToQuery = [activeLayerId];
        if (map.getLayer('bell-time-sound-bell')) {
          layersToQuery.push('bell-time-sound-bell');
        }
        const features = map.queryRenderedFeatures({ layers: layersToQuery });
        if (features && features.length > 0) {
          hasAutoFocused = true;
          findAndFocusClosestTemple(features);
        }
      } catch (e) {
        console.warn("Auto-focus on idle check failed:", e);
      }
    }
  });
}

// Called externally to kick off auto-focus (after intro overlay is dismissed)
function triggerAutoFocus() {
  readyToAutoFocus = true;
  if (!map) return;
  if (!hasAutoFocused) {
    try {
      const layersToQuery = [activeLayerId];
      if (map.getLayer('bell-time-sound-bell')) {
        layersToQuery.push('bell-time-sound-bell');
      }
      const features = map.queryRenderedFeatures({ layers: layersToQuery });
      if (features && features.length > 0) {
        hasAutoFocused = true;
        findAndFocusClosestTemple(features);
      }
    } catch (e) {
      console.warn("Auto-focus during overlay dismissal skipped:", e);
    }
    // If features weren't ready yet, the idle handler will catch it
  }
}

// Helper to clean temple name (remove parenthesized contents)
function cleanTempleName(name) {
  if (!name) return '';
  return name.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s*（.*?）\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

// Helper to parse diverse user-entered time formats to minutes of the day
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  timeStr = timeStr.toString().trim().toUpperCase();
  if (timeStr === 'N/A' || timeStr === 'NA' || timeStr === '') return null;

  let hours = 0;
  let minutes = 0;

  // Check for PM markers in Korean/English
  let isPm = false;
  if (timeStr.includes('PM') || timeStr.includes('오후') || timeStr.includes('저녁') || timeStr.includes('밤') || timeStr.includes('야간')) {
    isPm = true;
  }

  // Extract digits
  const match = timeStr.match(/(\d+)(?::(\d+))?/);
  if (!match) return null;

  hours = parseInt(match[1]);
  minutes = match[2] ? parseInt(match[2]) : 0;

  if (isPm && hours < 12) {
    hours += 12;
  } else if (!isPm && hours === 12 && (timeStr.includes('AM') || timeStr.includes('오전'))) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

// 3. Algorithm: Find closest temple to KST time and fly to it
function findAndFocusClosestTemple(features) {
  const now = new Date();

  // Convert current system time to Asia/Seoul KST hours & minutes
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const hourPart = parts.find(p => p.type === 'hour');
  const minPart = parts.find(p => p.type === 'minute');

  const currentKstHours = hourPart ? parseInt(hourPart.value) : now.getHours();
  const currentKstMinutes = minPart ? parseInt(minPart.value) : now.getMinutes();
  const currentKstInMinutes = currentKstHours * 60 + currentKstMinutes;

  let closestFeature = null;
  let minDifference = 1440; // Max difference in minutes on a 24h clock is 720, so 1440 is a safe inf threshold

  // To filter duplicates (since vector tiles sometimes split features across boundaries)
  const uniqueNames = new Set();

  features.forEach(f => {
    const p = f.properties;
    if (!p || !p.temple_name || uniqueNames.has(p.temple_name)) return;
    uniqueNames.add(p.temple_name);

    // Read Korean bell tolling time
    const timeStr = p.bell_time_korea;
    const templeMinutes = parseTimeToMinutes(timeStr);

    if (templeMinutes !== null) {
      // Calculate circular absolute difference on 24 hour clock
      let diff = Math.abs(templeMinutes - currentKstInMinutes);
      if (diff > 720) {
        diff = 1440 - diff;
      }

      if (diff < minDifference) {
        minDifference = diff;
        closestFeature = f;
      }
    }
  });

  // Action based on search results
  if (closestFeature) {
    const p = closestFeature.properties;
    const coords = closestFeature.geometry.coordinates;

    // Update bottom center status bar with gorgeous visual message
    clockStatus.textContent = `현재 우리나라 시간 기준 최인접 타종: ${cleanTempleName(p.temple_name)} (${p.bell_time_korea})`;

    // Fly smoothly to the closest temple on KST basis
    map.flyTo({
      center: coords,
      zoom: 6,
      duration: 3000,
      essential: true
    });

    // Automatically trigger popup and details drawer once flyTo completes
    setTimeout(() => {
      showTemplePopupAndCard(p, coords);
    }, 3200);

  } else {
    // Graceful Fallback if all temple times are currently N/A or NA
    clockStatus.textContent = `모든 사찰 타종시각 N/A 상태 (타종시각 입력 시 해당 사찰로 실시간 포커스)`;

    // Fly to regional Korea view so it doesn't look blank
    map.flyTo({
      center: [126.9780, 37.5665],
      zoom: 3.5,
      duration: 2000,
      essential: true
    });
  }
}

// Reusable function to display left details card
function showTemplePopupAndCard(p, coords) {
  // Close any active popups first
  const existingPopups = document.querySelectorAll('.mapboxgl-popup');
  existingPopups.forEach(popup => popup.remove());
  if (activePopup) {
    activePopup.remove();
  }

  // Stop current audio if switching to a different temple/country
  const targetIdOrCountry = p.id || p.country_ko;
  if (activeAudio && activeAudioTempleId !== targetIdOrCountry) {
    stopCurrentAudio();
  }

  // Save the target temple ID or country key
  detailCard.dataset.templeKey = targetIdOrCountry;

  // 2. Render side details glass card
  renderSideCard(p, coords);

  // Auto-play sound if it exists, is not pending, and not already manually playing
  const audioPath = templeAudioMap[p.id] || templeAudioMap[p.country_ko] || templeAudioMap[p.country_en];
  if (audioPath && audioPath !== 'pending') {
    if (!isManuallyPlaying) {
      playAudioAutomatically(audioPath, targetIdOrCountry);
    }
  }
}

// Helper to extract layers from loaded style
function populateLayerSelector(layers) {
  layerSelect.innerHTML = '';

  if (layers.length === 0) {
    publishAlert.style.display = 'block';
    const opt = document.createElement('option');
    opt.value = 'bell-time';
    opt.textContent = 'bell-time (기본값)';
    layerSelect.appendChild(opt);
    bindInteractiveEvents('bell-time');
    return;
  }

  publishAlert.style.display = 'none';
  let hasCustomPointLayer = false;
  let detectedDefaultLayer = '';

  // Loop through styles to find custom point/circle/symbol layers
  layers.forEach(layer => {
    const isInteractiveType = layer.type === 'circle' || layer.type === 'symbol';

    // Exclude standard Mapbox base elements
    const isCustomLayer = !layer.id.startsWith('road-') &&
      !layer.id.startsWith('water') &&
      !layer.id.startsWith('land') &&
      !layer.id.startsWith('building') &&
      !layer.id.startsWith('admin-') &&
      !layer.id.startsWith('poi-');

    if (isInteractiveType && isCustomLayer) {
      const opt = document.createElement('option');
      opt.value = layer.id;
      opt.textContent = layer.id;
      layerSelect.appendChild(opt);

      // Look for indicators in IDs to auto-select temple/bell dataset
      if (layer.id.includes('temple') || layer.id.includes('bell') || layer.id.includes('global') || !detectedDefaultLayer) {
        detectedDefaultLayer = layer.id;
      }
      hasCustomPointLayer = true;
    }
  });

  // Fallback if no specific custom layers were parsed cleanly
  if (!hasCustomPointLayer) {
    layers.forEach(layer => {
      const opt = document.createElement('option');
      opt.value = layer.id;
      opt.textContent = `${layer.id} (${layer.type})`;
      layerSelect.appendChild(opt);
    });
    detectedDefaultLayer = layers[layers.length - 1]?.id || 'bell-time';
  }

  // Prioritize exact matching layer if found
  const hasSpecificDefault = Array.from(layerSelect.options).some(opt => opt.value === 'bell-time');
  if (hasSpecificDefault) {
    detectedDefaultLayer = 'bell-time';
  }

  layerSelect.value = detectedDefaultLayer;
  bindInteractiveEvents(detectedDefaultLayer);

  // Listen for layer selection changes in settings panel
  layerSelect.addEventListener('change', (e) => {
    bindInteractiveEvents(e.target.value);
  });
}

// Function to dynamically attach Mapbox events to targeted style layers
function bindInteractiveEvents(layerId) {
  if (!map) return;
  const targetLayers = [layerId];
  if (map.getLayer('bell-time-sound-bell')) {
    targetLayers.push('bell-time-sound-bell');
  }

  // Unbind old events
  if (clickHandler && activeLayerId) {
    map.off('click', activeLayerId, clickHandler);
    map.off('mouseenter', activeLayerId, mouseEnterHandler);
    map.off('mouseleave', activeLayerId, mouseLeaveHandler);

    map.off('click', 'bell-time-sound-bell', clickHandler);
    map.off('mouseenter', 'bell-time-sound-bell', mouseEnterHandler);
    map.off('mouseleave', 'bell-time-sound-bell', mouseLeaveHandler);
  }

  activeLayerId = layerId;

  // Define standard click behavior for data point
  clickHandler = (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: targetLayers });
    if (!features.length) return;

    const p = features[0].properties;
    showTemplePopupAndCard(p, e.lngLat);
  };

  mouseEnterHandler = (e) => {
    map.getCanvas().style.cursor = 'pointer';

    const features = map.queryRenderedFeatures(e.point, { layers: targetLayers });
    if (!features.length) return;
    const p = features[0].properties;
    const templeKey = p.id || p.country_ko;
    const audioPath = templeAudioMap[p.id] || templeAudioMap[p.country_ko] || templeAudioMap[p.country_en];

    // If we're already manually playing sound, don't interrupt it
    if (activeAudio && isManuallyPlaying) return;

    // If there is an active audio but it's for a different temple/country, stop it first
    if (activeAudio && activeAudioTempleId !== templeKey) {
      stopCurrentAudio();
    }

    // Automatically play if audio exists and is not pending
    if (audioPath && audioPath !== 'pending') {
      playAudioAutomatically(audioPath, templeKey);
    }
  };

  mouseLeaveHandler = () => {
    map.getCanvas().style.cursor = '';
    // Only stop if the active audio is auto-played (not manually playing)
    if (activeAudio && !isManuallyPlaying) {
      stopCurrentAudio();
    }
  };

  // Bind events to layers
  targetLayers.forEach(l => {
    map.on('click', l, clickHandler);
    map.on('mouseenter', l, mouseEnterHandler);
    map.on('mouseleave', l, mouseLeaveHandler);
  });
}

// Helper to parse markdown-style links [Label](URL) from CSV columns
function parseMarkdownLinks(mdStr) {
  if (!mdStr) return [];
  const links = [];
  // Matches markdown links [Label](URL)
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(mdStr)) !== null) {
    links.push({
      text: match[0].includes('(') ? match[1] : match[0],
      url: match[2].trim()
    });
  }
  return links;
}

// Helper to determine if a URL points directly to an image file or a Wiki file page
function isImageUrl(url) {
  if (!url) return false;
  // Ignore query parameters and hashtags for extension check
  const cleanUrl = url.split('?')[0].split('#')[0];
  const isImageExt = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(cleanUrl);
  const isWikimediaUpload = url.includes('upload.wikimedia.org');
  const isWikiFilePage = url.includes('commons.wikimedia.org/wiki/File:') || url.includes('wikipedia.org/wiki/File:');
  return isImageExt || isWikimediaUpload || isWikiFilePage;
}

// Helper to extract File:Title from Wikipedia/Wikimedia Commons URL
function getWikiFileTitle(url) {
  const match = url.match(/\/wiki\/(File:[^?#]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

// Fetch the direct raw image URL from Wikimedia API and update the img element
function fetchWikiDirectUrl(fileTitle, imgElement) {
  const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url&format=json&origin=*`;

  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      const pages = data.query.pages;
      for (const id in pages) {
        if (pages[id].imageinfo && pages[id].imageinfo[0]) {
          const directUrl = pages[id].imageinfo[0].url;
          imgElement.src = directUrl;

          // Also update the direct view link in the fallback div
          const fallbackLink = imgElement.parentElement.querySelector('.img-fallback a');
          if (fallbackLink) {
            fallbackLink.href = directUrl;
          }
          return;
        }
      }
      // Fail state: show fallback button
      imgElement.style.display = 'none';
      const fallbackDiv = imgElement.parentElement.querySelector('.img-fallback');
      if (fallbackDiv) fallbackDiv.style.display = 'block';
    })
    .catch(() => {
      // Fail state
      imgElement.style.display = 'none';
      const fallbackDiv = imgElement.parentElement.querySelector('.img-fallback');
      if (fallbackDiv) fallbackDiv.style.display = 'block';
    });
}

// Beautifully render temple details in the floating glassmorphic card
function renderSideCard(p, coords) {
  // Safe extraction of longitude and latitude from coords
  const lng = coords && coords.lng !== undefined ? coords.lng : (coords ? coords[0] : 126.9780);
  const lat = coords && coords.lat !== undefined ? coords.lat : (coords ? coords[1] : 37.5665);

  const audioPath = templeAudioMap[p.id] || templeAudioMap[p.country_ko] || templeAudioMap[p.country_en];

  // Dynamic override for Kun Iam Tong / Pou Chai Sim Un local images
  if (p.temple_name && p.temple_name.includes('관음당') && p.temple_name.includes('보제선원')) {
    p.heritage_image_link = `[관음당 전경](kun_iam_1.png), [관음당 대웅전](kun_iam_2.png)`;
  }

  // Parse any photos or external resource links from the heritage_image_link column
  const imageLinks = parseMarkdownLinks(p.heritage_image_link);
  let directImages = imageLinks.filter(l => isImageUrl(l.url));
  const otherPages = imageLinks.filter(l => !isImageUrl(l.url));

  // For Kazakhstan, swap the order of images so the temple picture comes first
  if (p.country_ko === '카자흐스탄' && directImages.length >= 2) {
    const temp = directImages[0];
    directImages[0] = directImages[1];
    directImages[1] = temp;
  }

  // For Po Lin Monastery, swap the order of images so the second one comes first
  if (p.temple_name && p.temple_name.includes('보린사') && directImages.length >= 2) {
    const temp = directImages[0];
    directImages[0] = directImages[1];
    directImages[1] = temp;
  }

  // Setup image overrides for '봉은사', '불국사', and 'Paro Taktsang'
  if (p.temple_name && p.temple_name.includes('봉은사')) {
    directImages = [{ text: '봉은사 전경', url: 'bongeunsa.png' }];
  } else if (p.temple_name && p.temple_name.includes('불국사')) {
    directImages = [{ text: '불국사 전경', url: 'bulguksa.jpg' }];
  } else if (p.temple_name && p.temple_name.includes('Taktsang')) {
    directImages = [{ text: 'Paro Taktsang (Tiger\'s Nest Monastery)', url: 'images/paro_taktsang.jpg' }];
  }

  // Safe parsing of buddhist_philosophy field (supports JSON and raw text)
  let phil = {
    tradition: 'Buddhist Philosophy',
    quote: 'Peace comes from within. Do not seek it without.',
    body: '',
    keywords: []
  };

  if (p.buddhist_philosophy) {
    try {
      const parsed = JSON.parse(p.buddhist_philosophy);
      phil = {
        tradition: parsed.tradition || 'Buddhist Philosophy',
        quote: parsed.quote || 'Peace comes from within. Do not seek it without.',
        body: parsed.body || '',
        keywords: parsed.keywords || []
      };
    } catch (e) {
      phil.body = p.buddhist_philosophy;
      phil.keywords = [p.country_ko || '불교'].filter(Boolean);
    }
  }

  let middleContentHtml = '';

  if (directImages.length > 0) {
    middleContentHtml = `
      <div class="image-box">
        <div class="carousel-container">
          <div class="carousel-slides">
            ${directImages.map((img, i) => {
      const isWikiFile = img.url.includes('commons.wikimedia.org/wiki/File:') || img.url.includes('wikipedia.org/wiki/File:');
      const wikiTitle = isWikiFile ? getWikiFileTitle(img.url) : '';
      return `
                <div class="carousel-slide ${i === 0 ? 'active' : ''}">
                  <img class="carousel-image" 
                       src="${isWikiFile ? 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 200%22><rect width=%22100%%22 height=%22100%%22 fill=%22%23f3f3f3%22/><text x=%2250%%22 y=%2250%%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2214%22 fill=%22%23999999%22>이미지 로드 중...</text></svg>' : img.url}" 
                       alt="" 
                       ${isWikiFile ? `data-wiki-file="${wikiTitle}"` : ''} 
                       onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                  <div class="img-fallback" style="display:none;">
                    <a href="${img.url}" target="_blank" class="image-link-btn" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; border-radius: 0; border: none; background: rgba(0,0,0,0.04);">
                      <span>🖼️</span> 이미지 직접 보기
                    </a>
                  </div>
                </div>
              `;
    }).join('')}
          </div>
          ${directImages.length > 1 ? `
            <button class="carousel-btn prev-btn" type="button">&lsaquo;</button>
            <button class="carousel-btn next-btn" type="button">&rsaquo;</button>
            <div class="carousel-dots">
              ${directImages.map((_, i) => `
                <span class="carousel-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>
              `).join('')}
            </div>
          ` : ''}
        </div>
        
        ${otherPages.length > 0 ? `
          <div class="image-link-list">
            ${otherPages.map(page => `
              <a href="${page.url}" target="_blank" class="image-link-btn">
                <span>🔗</span> ${page.text}
              </a>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  } else {
    // Satellite Map Fallback
    const satelliteMapUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},16,0/300x200?access_token=${mapboxgl.accessToken}`;
    const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    middleContentHtml = `
      <div class="image-box">
        <div class="carousel-container">
          <a href="${gmapsUrl}" target="_blank" title="구글 지도 위성 뷰로 보기" style="display: block; width: 100%; height: 100%;">
            <img class="carousel-image" src="${satelliteMapUrl}" alt="위성지도" style="width: 100%; height: 100%; object-fit: cover;" />
            <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.6); color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; pointer-events: none; white-space: nowrap;">
              🛰️ 위성지도 (구글지도 연동)
            </div>
          </a>
        </div>
        
        ${otherPages.length > 0 ? `
          <div class="image-link-list">
            ${otherPages.map(page => `
              <a href="${page.url}" target="_blank" class="image-link-btn">
                <span>🔗</span> ${page.text}
              </a>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  const isFlippedDefault = !audioPath;
  const buddhaSvgPath = `M333.71,384.6c-4.53-11.19-14.6-18.4-24.48-24.16-4.42-3.28-6.11-9.09-10.97-12.18-4.38-4.3-11.25-6.32-15.87-10.3-11.34-14.13,3.97-29.14,4.2-44.55-.59-9.83-8.42-23.57-10.71-31.67-3.41-15.52-5.85-32.12-8.98-47.93-2.69-13.19-6.32-27.52-17.99-35.73-16.05-13.6-40.44-17.32-57.56-28.18-.56-.89-.55-1.99-.59-3.04.32-4.47-1.11-9.29,1.73-12.91,2.38-2.43,7.57-11.89,9.48-11.27,4.15,5.25-4.23,17.82,5.91,18.43,9.29-3.61,2.13-20.62,3.52-28.48.51-9.77,11.86-22.03,7.37-31.22-2.86-2.8-5.73-3.7-5-8.22.06-4.72-.3-10.17.26-14.7.79-4.06-1.2-7.31-4.67-9.25-.57-2.51.51-6.19-4.51-6.44-2.33-1.07.68-3.88-3.03-5.24-1.39-.52-3.07-.09-3.65-.5-1.09-1.27.14-4.07-1.4-5.61-1.36-1.96-4.81-.9-6.27-2-2.01-4.22,3.14-5.67-.3-11.33-.56-2.89-2.86-4.53-5.09-6.15-.97-1.08-1.33-3.01-2.65-3.93-.87-.66-2.03-.72-3.05-.98-2.59-1.23-4.31-4.53-6.82-6.13-5.67-2.03-9.97-.8-13.79,3.91-1.34,2.52-3.59,2.03-5.66,3.2-1.32.92-1.68,2.85-2.65,3.93-.84,1.07-2.48,1.53-3.46,2.68-1.36,2.54-3,5.39-2.77,8.42.21,1.85,2.6,4.89.74,6.45-1.9,1-6.01-.04-6.8,3.05-.66,1.59.22,3.55-.77,4.49-4.12.62-5.79-.02-5.91,5.33-3.75,1.32-5.47,1.36-5.06,6.03-.02.29-.07.57-.22.81-6.39,3.49-4.48,8.24-4.36,14.59-.27,4.3.55,9.3-.52,13.39-.84,1.8-3.84,2.61-4.9,4.76-3.18,8.94,6,19.76,7.46,28.69,1.41,8.51-2.13,17.4-.43,25.84,1.02,4.74,6.27,6.26,8.83,2.09,2.54-4.61-2.14-11.38,1.31-15.93,1.62-1.01,7.51,9.38,9.58,11.42,2.74,4.09,1.64,10.43,1.3,15.29-22.31,15.47-62.25,17.42-71.48,48.18-6.69,20.78-8.4,43.16-13.3,64.17-14.71,38.49-12.91,24.35-2.28,62.55.75,15.76-10.63,16.04-20.09,23.96-4.74,3.03-6.5,8.64-10.7,12-9.32,5.49-19.33,12.34-23.99,22.7-13.5,41.39,26.73,56.96,61.16,55.8,13.67,1,28.26-5.14,41.29-4.71,4.95,3.31,10.58,5.19,16.56,6.19,3.41.86-1.01,6.49,3.3,6.83,9.35.11,33.36.55,47.33.49,14.95-1.06,32.95,1.37-40.12-1.52,1.09-1.84-1.25-5.04,1.37-5.75,4.5-1.05,9.42-1.82,13.28-4.24,1.96-1.07,3.95-2.89,6.3-2.42,38.2,9.97,114.33,9.6,100.38-48.87l-.06-.15Z`;

  const philHtml = phil ? `
    <div class="flip-back-inner">
      <div class="flip-back-tradition">${phil.tradition}</div>
      <div class="flip-back-quote">"${phil.quote}"</div>
      <p class="flip-back-body">${phil.body}</p>
      <div class="flip-back-keywords">
        ${phil.keywords.map(k => `<span class="flip-keyword">${k}</span>`).join('')}
      </div>
    </div>
  ` : `<div class="flip-back-inner"><p class="flip-back-body">불교 철학 정보가 준비 중입니다.</p></div>`;

  detailContent.innerHTML = `
    <div class="flip-card-wrapper ${isFlippedDefault ? 'flipped' : ''}" id="card-flip-wrapper">
      <!-- FRONT FACE -->
      <div class="flip-card-face flip-card-front">
        <div class="flip-front-header">
          <svg class="flip-front-buddha-icon left" viewBox="0 0 335.45 447.56">
            <path d="${buddhaSvgPath}" />
          </svg>
          <div class="temple-title">${cleanTempleName(p.temple_name) || '사찰명 정보 없음'}</div>
          <svg class="flip-front-buddha-icon right" viewBox="0 0 335.45 447.56">
            <path d="${buddhaSvgPath}" />
          </svg>
        </div>

        ${middleContentHtml}

        ${audioPath ? `
        <div class="audio-section">
          <button type="button" class="audio-play-btn" id="audio-toggle-btn">Play Bell Sound</button>
        </div>
        ` : ''}

        <div class="time-section">
          <div class="time-row">
            <span class="time-label">현지 타종시각</span>
            <span class="time-value">${p.bell_time_local || '정보 없음'}</span>
          </div>
          <div class="time-row">
            <span class="time-label">한국 표준시각</span>
            <span class="time-value">${p.bell_time_korea || '정보 없음'}</span>
          </div>
        </div>

        ${phil ? `
        <button class="flip-trigger-btn" id="flip-to-back-btn" type="button">
          불교 철학 보기 ↗
        </button>` : ''}
      </div>

      <!-- BACK FACE -->
      <div class="flip-card-face flip-card-back">
        <div class="flip-back-header">
          <svg class="flip-back-buddha-icon left" viewBox="0 0 335.45 447.56">
            <path d="${buddhaSvgPath}" />
          </svg>
          <span class="flip-back-country">${p.country_ko || p.country_en}</span>
          <svg class="flip-back-buddha-icon right" viewBox="0 0 335.45 447.56">
            <path d="${buddhaSvgPath}" />
          </svg>
        </div>
        ${philHtml}
        <button class="flip-trigger-btn flip-trigger-back" id="flip-to-front-btn" type="button">
          See Temple Bell Time &rarr;
        </button>
      </div>
    </div>
  `;

  // Connect Flip Card Event Listeners and Sync Height
  setTimeout(() => {
    const wrapper = detailContent.querySelector('#card-flip-wrapper');
    const frontFace = detailContent.querySelector('.flip-card-front');
    const backFace = detailContent.querySelector('.flip-card-back');
    const flipToBackBtn = detailContent.querySelector('#flip-to-back-btn');
    const flipToFrontBtn = detailContent.querySelector('#flip-to-front-btn');

    if (wrapper && frontFace && backFace) {
      function syncHeight() {
        if (wrapper.classList.contains('flipped')) {
          wrapper.style.height = backFace.offsetHeight + 'px';
        } else {
          wrapper.style.height = frontFace.offsetHeight + 'px';
        }
      }

      syncHeight();
      // Account for images or dynamic resources loading
      setTimeout(syncHeight, 150);
      setTimeout(syncHeight, 400);

      if (flipToBackBtn) {
        flipToBackBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          wrapper.classList.add('flipped');
          syncHeight();
          setTimeout(syncHeight, 100);
          setTimeout(syncHeight, 300);
          setTimeout(syncHeight, 800);
        });
      }

      if (flipToFrontBtn) {
        flipToFrontBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          wrapper.classList.remove('flipped');
          syncHeight();
          setTimeout(syncHeight, 100);
          setTimeout(syncHeight, 300);
          setTimeout(syncHeight, 800);
        });
      }
    }
  }, 50);

  // Trigger Wikimedia Commons direct URL resolution for any wiki file page images
  const wikiImages = detailContent.querySelectorAll('img[data-wiki-file]');
  wikiImages.forEach(img => {
    const fileTitle = img.getAttribute('data-wiki-file');
    if (fileTitle) {
      fetchWikiDirectUrl(fileTitle, img);
    }
  });

  // Bind Carousel Event Listeners if there are multiple images
  const carousel = detailContent.querySelector('.carousel-container');
  if (carousel) {
    const slides = carousel.querySelectorAll('.carousel-slide');
    const prevBtn = carousel.querySelector('.prev-btn');
    const nextBtn = carousel.querySelector('.next-btn');
    const dots = carousel.querySelectorAll('.carousel-dot');

    if (slides.length > 1 && prevBtn && nextBtn) {
      let currentIndex = 0;

      function showSlide(index) {
        if (index < 0) {
          currentIndex = slides.length - 1;
        } else if (index >= slides.length) {
          currentIndex = 0;
        } else {
          currentIndex = index;
        }

        slides.forEach((slide, idx) => {
          slide.classList.toggle('active', idx === currentIndex);
        });

        dots.forEach((dot, idx) => {
          dot.classList.toggle('active', idx === currentIndex);
        });
      }

      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showSlide(currentIndex - 1);
      });

      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showSlide(currentIndex + 1);
      });

      dots.forEach((dot) => {
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetIndex = parseInt(dot.getAttribute('data-index'));
          showSlide(targetIndex);
        });
      });
    }
  }

  // Connect audio button if it exists
  const audioBtn = detailContent.querySelector('#audio-toggle-btn');
  if (audioBtn && audioPath) {
    const templeKey = p.id || p.country_ko;
    // If this audio is already playing (e.g. card re-rendered while playing), sync the button state!
    if (activeAudio && !activeAudio.paused && activeAudioTempleId === templeKey) {
      audioBtn.classList.add('playing');
      audioBtn.innerHTML = 'Stop Bell Sound';
    }

    audioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAudio(audioPath, audioBtn, templeKey);
    });
  }

  // Activate with smooth slide & fade animation
  detailCard.classList.add('active');
}



