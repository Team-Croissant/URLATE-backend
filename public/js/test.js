const canvas = document.getElementById('componentCanvas');
const ctx = canvas.getContext("2d");
let pattern = {};
let userName = '';
let settings, sync, song, tracks, pixelRatio, offset, bpm, speed;
let pointingCntElement = {"v1": '', "v2": '', "i": ''};
let circleBulletAngles = [];
let destroyedBullets = new Set([]);
let prevDestroyedBullets = new Set([]);
let destroyedNotes = new Set([]);
let mouseX = 0, mouseY = 0;
let score = 0, combo = 0, displayScore = 0;
let perfect = 0;
let great = 0;
let good = 0;
let bad = 0;
let miss = 0;
let mouseClicked = false;
let mouseClickedMs = -1;
let frameCounterMs = Date.now();

function getParam(sname) {
  let params = location.search.substr(location.search.indexOf("?") + 1);
  let sval = "";
  params = params.split("&");
  for (let i = 0; i < params.length; i++) {
      temp = params[i].split("=");
      if ([temp[0]] == sname) { sval = temp[1]; }
  }
  return sval;
}

document.addEventListener("DOMContentLoaded", () => {
  fetch(`${api}/getTracks`, {
    method: 'GET',
    credentials: 'include'
  })
  .then(res => res.json())
  .then((data) => {
    if(data.result == 'success') {
      tracks = data.tracks;
    } else {
      alert('Failed to load song list.');
      console.error('Failed to load song list.');
    }
  }).catch((error) => {
    alert(`Error occured.\n${error}`);
    console.error(`Error occured.\n${error}`);
  });
  fetch(`${api}/getStatus`, {
    method: 'GET',
    credentials: 'include'
  })
  .then(res => res.json())
  .then((data) => {
    if(data.status == "Not authorized") {
      window.location.href = `${url}/authorize`;
    } else if(data.status == "Not registered") {
      window.location.href = `${url}/join`;
    } else if(data.status == "Not logined") {
      window.location.href = url;
    } else {
      fetch(`${api}/getUser`, {
        method: 'GET',
        credentials: 'include'
      })
      .then(res => res.json())
      .then((data) => {
        if(data.result == 'success') {
          userName = data.nickname;
          settings = JSON.parse(data.settings);
          settingApply();
        } else {
          alert(`Error occured.\n${data.description}`);
          console.error(`Error occured.\n${data.description}`);
        }
      }).catch((error) => {
        alert(`Error occured.\n${error}`);
        console.error(`Error occured.\n${error}`);
      });
    }
  }).catch((error) => {
    alert(`Error occured.\n${error}`);
    console.error(`Error occured.\n${error}`);
  });
  initialize(true);
});

const initialize = (isFirstCalled) => {
  if(isFirstCalled) {
    pattern = JSON.parse(decodeURI(getParam('pattern')));
    document.getElementById('title').textContent = pattern.information.track;
    document.getElementById('artist').textContent = pattern.information.producer;
    document.getElementById('authorNamespace').textContent = pattern.information.author;
    offset = pattern.information.offset;
    bpm = pattern.information.bpm;
    speed = pattern.information.speed;
  }
  canvas.width = window.innerWidth * pixelRatio;
  canvas.height = window.innerHeight * pixelRatio;
};

const settingApply = () => {
  Howler.volume(settings.sound.musicVolume / 100);
  sync = parseInt(settings.sound.offset);
  document.getElementById('loadingContainer').style.opacity = 1;
  let fileName = '';
  for(let i = 0; i < tracks.length; i++) {
    if(tracks[i].name == pattern.information.track) {
      fileName = tracks[i].fileName;
      document.getElementById("album").src = `${cdn}/albums/${fileName}.png`;
      document.getElementById('canvasBackgroundImage').style.backgroundImage = `url(${cdn}/albums/${fileName}.png)`;
      break;
    }
  }
  fetch(`${api}/getTracks`, {
    method: 'GET',
    credentials: 'include'
  })
  .then(res => res.json())
  .then((data) => {
    if(data.result == 'success') {
      song = new Howl({
        src: [`${cdn}/tracks/${settings.sound.quality}/${fileName}.mp3`],
        autoplay: false,
        loop: false,
        onend: () => {
          song.stop();
        },
        onload: () => {
        }
      });
    } else {
      alert('Failed to load song list.');
    }
  }).catch((error) => {
    alert(`Error occured.\n${error}`);
  });
};

const eraseCnt = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

const drawParticle = (n, x, y, j) => {
  x = canvas.width / 200 * (x + 100);
  y = canvas.height / 200 * (y + 100);
  if(n == 0) { //Destroy
    let randomDirection = [];
    for(let i = 0; i < 3; i++) {
      let x = Math.floor(Math.random() * 4) - 2;
      let y = Math.floor(Math.random() * 4) - 2;
      randomDirection[i] = [x, y];
    }
    const raf = (n, w) => {
      w -= 0.1;
      for(let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.fillStyle = '#222';
        ctx.arc(x + (n * randomDirection[i][0]), y + (n * randomDirection[i][1]), w, 0, 2 * Math.PI);
        ctx.fill();
      }
      if(w - 0.1 >= 0) {
        requestAnimationFrame(() => {
          raf(++n, w);
        });
      }
    };
    raf(1, 5);
  } else if(n == 1) { //Click Note
    const raf = (w, s) => {
      ctx.beginPath();
      let width = canvas.width / 50;
      let p = 100 - ((s + 500 - Date.now()) / 5);
      let grd = ctx.createLinearGradient(x - w, y - w, x + w, y + w);
      grd.addColorStop(0, `rgba(251, 73, 52, ${0.5 - p / 200})`);
      grd.addColorStop(1, `rgba(235, 217, 52, ${0.5 - p / 200})`);
      ctx.strokeStyle = grd;
      ctx.arc(x, y, w, 0, 2 * Math.PI);
      ctx.stroke();
      w = canvas.width / 70 + canvas.width / 400 + width * (p / 100);
      if(p < 100) {
        requestAnimationFrame(() => {
          raf(w, s);
        });
      }
    };
    let d = Date.now();
    raf(canvas.width / 70 + canvas.width / 400, Date.now());
  } else if(n == 2) { //Click Default
    const raf = (w, s) => {
      ctx.beginPath();
      let width = canvas.width / 60;
      let p = 100 - ((s + 300 - Date.now()) / 3);
      let grd = ctx.createLinearGradient(x - w, y - w, x + w, y + w);
      grd.addColorStop(0, `rgba(174, 102, 237, ${0.2 - p / 500})`);
      grd.addColorStop(1, `rgba(102, 183, 237, ${0.2 - p / 500})`);
      ctx.strokeStyle = grd;
      ctx.arc(x, y, w, 0, 2 * Math.PI);
      ctx.stroke();
      w = canvas.width / 70 + canvas.width / 400 + width * (p / 100);
      if(p < 100) {
        requestAnimationFrame(() => {
          raf(w, s);
        });
      }
    };
    raf(canvas.width / 70 + canvas.width / 400, Date.now());
  } else if(n == 3) { //Judge
    const raf = (y, s) => {
      console.log(y);
      ctx.beginPath();
      let p = 100 - ((s + 300 - Date.now()) * (1000 / 3));
      let newY = y - Math.round(p / 10);
      ctx.fillStyle = `rgba(50, 50, 50, ${1 - p / 100})`;
      ctx.font = "3vh Metropolis";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(j, x, newY);
      if(p < 100) {
        requestAnimationFrame(() => {
          raf(y, s);
        });
      }
    };
    raf(y, Date.now());
  }
};

const drawNote = (p, x, y) => {
  p = Math.max(p, 0);
  x = canvas.width / 200 * (x + 100);
  y = canvas.height / 200 * (y + 100);
  let w = canvas.width / 40;
  let grd = ctx.createLinearGradient(x - w, y - w, x + w, y + w);
  let opacity = 1;
  if(p > 100) {
    opacity = (130 - p) / 130;
  }
  grd.addColorStop(0, `rgba(251, 73, 52, ${opacity})`);
  grd.addColorStop(1, `rgba(235, 217, 52, ${opacity})`);
  ctx.strokeStyle = grd;
  ctx.fillStyle = grd;
  ctx.lineWidth = Math.round(canvas.width / 500);
  ctx.beginPath();
  ctx.arc(x, y, w, 0, p / 50 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, w / 100 * p, 0, 2 * Math.PI);
  ctx.fill();
};

const drawCursor = () => {
  ctx.beginPath();
  let w = canvas.width / 70;
  if(mouseClickedMs == -1) {
    mouseClickedMs = Date.now() - 100;
  }
  if(mouseClicked) {
    if(mouseClickedMs + 20 > Date.now()) {
      w = w + (canvas.width / 400 * (1 - ((mouseClickedMs + 20 - Date.now()) / 20)));
    } else {
      w = w + (canvas.width / 400 * 1);
    }
  } else {
    if(mouseClickedMs + 100 > Date.now()) {
      w = w + (canvas.width / 400 * (mouseClickedMs + 100 - Date.now()) / 100);
    }
  }
  x = canvas.width / 200 * (mouseX + 100);
  y = canvas.height / 200 * (mouseY + 100);
  let grd = ctx.createLinearGradient(x - w, y - w, x + w, y + w);
  grd.addColorStop(0, `rgb(174, 102, 237)`);
  grd.addColorStop(1, `rgb(102, 183, 237)`);
  ctx.fillStyle = grd;
  ctx.arc(x, y, w, 0, 2 * Math.PI);
  ctx.fill();
};

const drawBullet = (n, x, y, a) => {
  x = canvas.width / 200 * (x + 100);
  y = canvas.height / 200 * (y + 100);
  let w = canvas.width / 80;
  ctx.fillStyle = "#555";
  ctx.strokeStyle = "#555";
  ctx.beginPath();
  switch(n) {
    case 0:
      a = Math.PI * (a / 180 + 0.5);
      ctx.arc(x, y, w, a, a + Math.PI);
      a = a - (0.5 * Math.PI);
      ctx.moveTo(x - (w * Math.sin(a)), y + (w * Math.cos(a)));
      ctx.lineTo(x + (w * 2 * Math.cos(a)), y + (w * 2 * Math.sin(a)));
      ctx.lineTo(x + (w * Math.sin(a)), y - (w * Math.cos(a)));
      ctx.fill();
      break;
    case 1:
      ctx.arc(x, y, w, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      ctx.font = "18px Metropolis";
      ctx.fillStyle = "#F55";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`drawBullet:bullet number isn't specified.`, canvas.width / 100, canvas.height / 100);
      console.error(`drawBullet:bullet number isn't specified.`);
  }
};

const cntRender = () => {
  if(window.devicePixelRatio != pixelRatio) {
    pixelRatio = window.devicePixelRatio;
    initialize(false);
  }
  try {
    pointingCntElement = {"v1": '', "v2": '', "i": ''};
    const seek = song.seek() - (offset + sync) / 1000;
    let start = lowerBound(pattern.triggers, 0);
    let end = upperBound(pattern.triggers, seek * 1000 + 2); //2 for floating point miss
    const renderTriggers = pattern.triggers.slice(start, end);
    eraseCnt();
    destroyedBullets.clear();
    for(let i = 0; i < renderTriggers.length; i++) {
      if(renderTriggers[i].value == 0) {
        if(!destroyedBullets.has(renderTriggers[i].num)) {
          if(!prevDestroyedBullets.has(renderTriggers[i].num)) {
            let j = renderTriggers[i].num;
            const p = (seek * 1000 - pattern.bullets[j].ms) / (bpm * 40 / speed / pattern.bullets[j].speed) * 100;
            const left = pattern.bullets[j].direction == 'L';
            let x = (left ? -1 : 1) * (100 - p);
            let y = 0;
            if(pattern.bullets[j].value == 0) {
              y = pattern.bullets[j].location + p * getTan(pattern.bullets[j].angle) * (left ? 1 : -1);
            } else {
              if(!circleBulletAngles[j]) circleBulletAngles[j] = calcAngleDegrees((left ? -100 : 100) - mouseX, pattern.bullets[j].location - mouseY);
              if(left) {
                if(110 > circleBulletAngles[j] && circleBulletAngles[j] > 0) circleBulletAngles[j] = 110;
                else if(0 > circleBulletAngles[j] && circleBulletAngles[j] > -110) circleBulletAngles[j] = -110;
              } else {
                if(70 < circleBulletAngles[j] && circleBulletAngles[j] > 0) circleBulletAngles[j] = 70;
                else if(0 > circleBulletAngles[j] && circleBulletAngles[j] < -70) circleBulletAngles[j] = -70;
              }
              y = pattern.bullets[j].location + p * getTan(circleBulletAngles[j]) * (left ? 1 : -1);
            }
            drawParticle(0, x, y);
          }
          destroyedBullets.add(renderTriggers[i].num);
        }
      } else if(renderTriggers[i].value == 1) {
        start = lowerBound(pattern.bullets, seek * 1000 - (bpm * 40));
        end = upperBound(pattern.bullets, seek * 1000);
        const renderBullets = pattern.bullets.slice(start, end);
        for(let j = 0; renderBullets.length > j; j++) {
          if(!destroyedBullets.has(start + j)) {
            if(!prevDestroyedBullets.has(start + j)) {
              const p = (seek * 1000 - renderBullets[j].ms) / (bpm * 40 / speed / renderBullets[j].speed) * 100;
              const left = renderBullets[j].direction == 'L';
              let x = (left ? -1 : 1) * (100 - p);
              let y = 0;
              if(renderBullets[j].value == 0) {
                y = renderBullets[j].location + p * getTan(renderBullets[j].angle) * (left ? 1 : -1);
              } else {
                if(!circleBulletAngles[start+j]) circleBulletAngles[start+j] = calcAngleDegrees((left ? -100 : 100) - mouseX, renderBullets[j].location - mouseY);
                if(left) {
                  if(110 > circleBulletAngles[start+j] && circleBulletAngles[start+j] > 0) circleBulletAngles[start+j] = 110;
                  else if(0 > circleBulletAngles[start+j] && circleBulletAngles[start+j] > -110) circleBulletAngles[start+j] = -110;
                } else {
                  if(70 < circleBulletAngles[start+j] && circleBulletAngles[start+j] > 0) circleBulletAngles[start+j] = 70;
                  else if(0 > circleBulletAngles[start+j] && circleBulletAngles[start+j] < -70) circleBulletAngles[start+j] = -70;
                }
                y = renderBullets[j].location + p * getTan(circleBulletAngles[start+j]) * (left ? 1 : -1);
              }
              drawParticle(0, x, y);
            }
            destroyedBullets.add(start + j);
          }
        }
      } else if(renderTriggers[i].value == 2) {
        bpm = renderTriggers[i].bpm;
      } else if(renderTriggers[i].value == 3) {
        canvas.style.opacity = renderTriggers[i].opacity;
      } else if(renderTriggers[i].value == 4) {
        speed = renderTriggers[i].speed;
      } else if(renderTriggers[i].value == 5) {
        if(renderTriggers[i].ms - 1 <= seek * 1000 && renderTriggers[i].ms + renderTriggers[i].time > seek * 1000) {
          ctx.beginPath();
          ctx.fillStyle = "#111";
          ctx.font = `${renderTriggers[i].size} Metropolis`;
          ctx.textAlign = renderTriggers[i].align;
          ctx.textBaseline = "middle";
          ctx.fillText(renderTriggers[i].text, canvas.width / 200 * (renderTriggers[i].x + 100), canvas.height / 200 * (renderTriggers[i].y + 100));
        }
      }
    }
    prevDestroyedBullets = new Set(destroyedBullets);
    start = lowerBound(pattern.patterns, seek * 1000 - (bpm * 4 / speed));
    end = upperBound(pattern.patterns, seek * 1000 + (bpm * 14 / speed));
    const renderNotes = pattern.patterns.slice(start, end);
    for(let i = 0; i < renderNotes.length; i++) {
      const p = ((bpm * 14 / speed) - (renderNotes[i].ms - (seek * 1000))) / (bpm * 14 / speed) * 100;
      trackMouseSelection(start + i, 0, renderNotes[i].value, renderNotes[i].x, renderNotes[i].y);
      drawNote(p, renderNotes[i].x, renderNotes[i].y);
    }
    start = lowerBound(pattern.bullets, seek * 1000 - (bpm * 40));
    end = upperBound(pattern.bullets, seek * 1000);
    const renderBullets = pattern.bullets.slice(start, end);
    for(let i = 0; i < renderBullets.length; i++) {
      if(!destroyedBullets.has(start + i)) {
        const p = (seek * 1000 - renderBullets[i].ms) / (bpm * 40 / speed / renderBullets[i].speed) * 100;
        const left = renderBullets[i].direction == 'L';
        let x = (left ? -1 : 1) * (100 - p);
        let y = 0;
        if(renderBullets[i].value == 0) {
          y = renderBullets[i].location + p * getTan(renderBullets[i].angle) * (left ? 1 : -1);
          trackMouseSelection(start + i, 1, renderBullets[i].value, x, y);
          drawBullet(renderBullets[i].value, x, y, renderBullets[i].angle + (left ? 0 : 180));
        } else {
          if(!circleBulletAngles[start+i]) circleBulletAngles[start+i] = calcAngleDegrees((left ? -100 : 100) - mouseX, renderBullets[i].location - mouseY);
          if(left) {
            if(110 > circleBulletAngles[start+i] && circleBulletAngles[start+i] > 0) circleBulletAngles[start+i] = 110;
            else if(0 > circleBulletAngles[start+i] && circleBulletAngles[start+i] > -110) circleBulletAngles[start+i] = -110;
          } else {
            if(70 < circleBulletAngles[start+i] && circleBulletAngles[start+i] > 0) circleBulletAngles[start+i] = 70;
            else if(0 > circleBulletAngles[start+i] && circleBulletAngles[start+i] < -70) circleBulletAngles[start+i] = -70;
          }
          y = renderBullets[i].location + p * getTan(circleBulletAngles[start+i]) * (left ? 1 : -1);
          trackMouseSelection(start + i, 1, renderBullets[i].value, x, y);
          drawBullet(renderBullets[i].value, x, y, '');
        }
      }
    }
  } catch (e) {
    if(e) {
      ctx.font = "18px Metropolis";
      ctx.fillStyle = "#F55";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(e, canvas.width / 100, canvas.height / 100);
      console.error(e);
    }
  }
  if(displayScore < score) {
    displayScore += score / 60;
  }
  ctx.font = "4vh Heebo";
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(`${Math.round(displayScore)}`.padStart(8, 0), canvas.width / 2, canvas.height / 80);
  ctx.font = "2.5vh Heebo";
  ctx.fillStyle = "#555";
  ctx.fillText(`${combo}x`, canvas.width / 2, canvas.height / 70 + canvas.height / 25);
  drawCursor();

  //fps counter
  let fps = 1000 / (Date.now() - frameCounterMs);
  frameCounterMs = Date.now();
  window.requestAnimationFrame(cntRender);
};

const trackMousePos = () => {
  const x = event.clientX / canvasContainer.offsetWidth * 200 - 100;
  const y = event.clientY / canvasContainer.offsetHeight * 200 - 100;
  mouseX = x;
  mouseY = y;
};

const trackMouseSelection = (i, v1, v2, x, y) => {
  const seek = song.seek() - (offset + sync) / 1000;
  const powX = (mouseX - x) * canvasContainer.offsetWidth / 200 * pixelRatio;
  const powY = (mouseY - y) * canvasContainer.offsetHeight / 200 * pixelRatio;
  switch(v1) {
    case 0:
      const p = ((bpm * 14 / speed) - (pattern.patterns[i].ms - (seek * 1000))) / (bpm * 14 / speed) * 100;
      if(Math.sqrt(Math.pow(powX, 2) + Math.pow(powY, 2)) <= canvas.width / 40 + canvas.width / 70) {
        pointingCntElement = {"v1": v1, "v2": v2, "i": i};
      }
      break;
    case 1:
      if(Math.sqrt(Math.pow(powX, 2) + Math.pow(powY, 2)) <= canvas.width / (song.playing() ? 80 : 50)) {
        pointingCntElement = {"v1": v1, "v2": v2, "i": i};
      }
      break;
    default:
      ctx.font = "18px Metropolis";
      ctx.fillStyle = "#F55";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`trackMouseSelection:Undefined element.`, canvas.width / 100, canvas.height / 100);
      console.error(`trackMouseSelection:Undefined element.`);
  }
};

const compClicked = () => {
  mouseClicked = true;
  mouseClickedMs = Date.now();
  if(pointingCntElement.v1 === 0 && !destroyedNotes.has(pointingCntElement.i)) {
    drawParticle(1, mouseX, mouseY);
    let seek = song.seek() * 1000;
    let ms = pattern.patterns[pointingCntElement.i].ms;
    let perfect = 60000 / bpm / 8;
    let great = 60000 / bpm / 5;
    let good = 60000 / bpm / 3;
    let bad = 60000 / bpm / 2;
    let x = pattern.patterns[pointingCntElement.i].x;
    let y = pattern.patterns[pointingCntElement.i].y;
    if(seek < ms + perfect && seek > ms - perfect) {
      calculateScore('perfect', pointingCntElement.i);
      drawParticle(3, x, y, 'Perfect');
      perfect++;
    } else if(seek > ms - great && seek < ms) {
      calculateScore('great', pointingCntElement.i);
      drawParticle(3, x, y, 'Great');
      great++;
    } else if(seek > ms - good && seek < ms) {
      calculateScore('good', pointingCntElement.i);
      drawParticle(3, x, y, 'Good');
      good++;
    } else if(seek > ms - bad && seek < ms) {
      calculateScore('bad', pointingCntElement.i);
      drawParticle(3, x, y, 'Bad');
      bad++;
    } else {
      calculateScore('miss', pointingCntElement.i);
      drawParticle(3, x, y, 'Miss');
      miss++;
    }
  } else {
    drawParticle(2, mouseX, mouseY);
  }
};

const compReleased = () => {
  mouseClicked = false;
  mouseClickedMs = Date.now();
};

const calculateScore = (judge, i) => {
  destroyedNotes.add(i);
  pattern.patterns[i].ms = song.seek() * 1000;
  if(judge == 'miss') {
    combo = 0;
    return;
  }
  combo++;
  if(judge == 'perfect') {
    score += combo * 200;
  } else if(judge == 'great') {
    score += combo * 150;
  } else if(judge == 'good') {
    score += combo * 100;
  } else {
    score += combo / 2 * 50;
  }
};

Pace.on('done', () => {
  setTimeout(() => {
    cntRender();
    document.getElementById('componentCanvas').classList.add('opacity1');
    document.getElementById('loadingContainer').classList.remove('opacity1');
    document.getElementById('loadingContainer').classList.add('opacity0');
    setTimeout(() => {
      document.getElementById('loadingContainer').style.display = 'none';
      document.getElementById('componentCanvas').style.transitionDuration = '0s';
    }, 1000);
    setTimeout(songPlayPause, 4000);
  }, 1000);
});

const songPlayPause = () => {
  if(song.playing()) {
    song.pause();
  } else {
    circleBulletAngles = [];
    song.play();
  }
};

document.onkeydown = e => {
  e = e || window.event;
  if(e.keyCode == 27) { // Esc
    e.preventDefault();
    //menu
    return;
  }
  compClicked();
};

document.onkeyup = e => {
  e = e || window.event;
  if(e.keyCode == 27) { // Esc
    return;
  }
  mouseClicked = false;
  mouseClickedMs = Date.now();
};

window.addEventListener("resize", () => {
  initialize(false);
});