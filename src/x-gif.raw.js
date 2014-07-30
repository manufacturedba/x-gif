import Playback from './playback.js';
import Strategies from './strategies.js';

// Shim & native-safe ownerDocument lookup
var owner = (document._currentScript || document.currentScript).ownerDocument;

class XGifController {
  constructor(xgif) {
    this.xgif = xgif;
    this.setupComponent();
    this.srcChanged(this.xgif.getAttribute('src'))
  }

  setupComponent() {
    // Create a shadow root
    this.shadow = this.xgif.createShadowRoot();

    // stamp out our template in the shadow dom
    var template = owner.querySelector("#template").content.cloneNode(true);
    this.shadow.appendChild(template);
  }

  srcChanged(src) {
    if (!src) return;
    console.log("Loading " + src);
    this.playback = new Playback(this, this.shadow.querySelector('#frames'), src, this.xgif.options);
    this.playback.ready.then(() => {
      if (this.xgif.playbackMode === 'speed') {
        this.playback.startSpeed(this.xgif.speed);
      }
    });
  }

  speedChanged(speed) {
    if (this.playback) this.playback.speed = speed;
  }

  stoppedChanged(nowStop) {
    if (this.playback) {
      if (nowStop && !this.playback.stopped) {
        this.playback.stop();
      } else if (!nowStop && this.playback.stopped) {
        this.playback.start();
      }
    }
  }

  pingPongChanged(nowPingPong) {
    if (this.playback) this.playback.pingPong = nowPingPong;
  }

  clock(beatNr, beatDuration, beatFraction) {
    if (this.playback && this.playback.gif) {
      this.playback.fromClock(beatNr, beatDuration, beatFraction);
    }
  }

  relayout() {
    if (this.playback && this.xgif.options.fill) {
      this.playback.scaleToFill();
    }
  }
}

// Register the element in the document
class XGif extends HTMLElement {
  createdCallback() {
    this.determinePlaybackMode()
    this.determinePlaybackOptions()
    this.controller = new XGifController(this);
  }

  determinePlaybackMode() {
    // We might not want x-gif to animate itself at all
    if (this.hasAttribute('exploded') || this.hasAttribute('sync')) {
      this.playbackStrategy = undefined;
      return;
    }

    // BPM Mode
    var maybeBPM = parseFloat(this.getAttribute('bpm'))
    if (!isNaN(maybeBPM)) {
      this.playbackStrategy = 'bpm';
      this.bpm = maybeBPM;
      return;
    }

    // Default to THE BUS THAT COULDNT SLOW DOWN mode
    var maybeSpeed = parseFloat(this.getAttribute('speed'))
    this.speed = isNaN(maybeSpeed) ? 1.0 : maybeSpeed;
    this.playbackMode = 'speed';
  }

  determinePlaybackOptions() {
    var maybeNtimes = parseFloat(this.getAttribute('n-times'))
    this.options = {
      stopped: this.hasAttribute('stopped'),
      fill: this.hasAttribute('fill'),
      nTimes: isNaN(maybeNtimes) ? null : maybeNtimes,
      hard: this.hasAttribute('hard'),
      pingPong: this.hasAttribute('ping-pong')
    }
  }

  attributeChangedCallback(attribute, oldVal, newVal) {
    if (attribute == "src") {
      this.controller.srcChanged(newVal)
    } else if (attribute == "speed") {
      this.determinePlaybackMode();
      this.controller.speedChanged(this.speed);
    } else if (attribute == "bpm") {
      this.determinePlaybackMode();
      this.controller.speedChanged(this.bpm);
    } else if (attribute == "stopped") {
      this.determinePlaybackOptions();
      this.controller.stoppedChanged(this.options.stopped);
    } else if (attribute == "ping-pong") {
      this.determinePlaybackOptions();
      this.controller.pingPongChanged(this.options.pingPong);
    }
  }

  clock(beatNr, beatDuration, beatFraction) {
    this.controller.clock(beatNr, beatDuration, beatFraction)
  }
}

// Register our todo-item tag with the document
document.registerElement('x-gif', XGif);
