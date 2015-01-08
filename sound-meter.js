/* helpers */
Array.prototype.average = function () {
    var i = 0,
        l = this.length,
        s = 0;

    for (i = 0; i < l; i++) {
        s += this[i];
    }

    return s / l;
};

function soundMeterCtrl () {

    var self = this;

    //cross browser audio support
    var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || false;
    var audioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || false;

    var sound = {
        on:                         false,  //if sound level is higher then thresold and longer then minimum delta time
        peek:                       false,  //peek flag
        enable:                     true,   //if sound events is triggered
        level:                      0,      //raw level
        normalized:                 0,      //normalized level (with dynamic noise level)
        noise:                      0,      //raw noise level
        minSoundLevel:              25,     //minmum sound level above noise level to trigger start event
        minSoundLevel_normalized:   25,     //normalized minimum sound level above noise level to trigger start event
        max:                        60,
        max_normalized:             60,
        minDeltaTime:               500,     //delta time [ms] if peek duration is longer than minDeltaTime start blow event is triggered
        duration:                   0
    };


    this.init = function () {
        //soundMeter initialization
        var initSuccessful  = new Event ('sound.init.ok'),
            initFail        = new Event ('sound.init.fail'),
            dynamicLevel    = new Event ('sound.dynamic.level');


        var buffer_size     = 125,                               //how many samples take place in normalize process
            buffer          = new Array (buffer_size),          //buffer for normalize level
            sample          = 0,                                //sample count (iterator var)
            inited          = false;                            //initial fill of buffer


        if (typeof getUserMedia === "function") {
            getUserMedia.call  (navigator,
                {audio:true},
                function(stream) {
                    //Audio context initalization
                    audioCtx        = new audioContext();
                    analyser        = audioCtx.createAnalyser();
                    microphone      = audioCtx.createMediaStreamSource(stream);
                    javascriptNode  = audioCtx.createScriptProcessor(2048, 1, 1);

                    analyser.smoothingTimeConstant = 0.8;
                    analyser.fftSize = 1024;

                    microphone.connect(analyser);
                    analyser.connect(javascriptNode);
                    javascriptNode.connect(audioCtx.destination);

                    //reinit views for blowing version
                    document.dispatchEvent (initSuccessful);

                    //handle volume meter
                    javascriptNode.onaudioprocess = function () {
                        var array = new Uint8Array(analyser.frequencyBinCount);
                        analyser.getByteFrequencyData(array);
                        var values = 0;

                        var length = array.length;
                        for (var i = 0; i < length; i++) {
                            values += (array[i]);
                        }

                        var average = values / length;

                        sound.level = average;

                        if (inited) {
                            buffer = buffer.slice(1);
                            buffer.push (average);

                            sound.normalized = average - buffer.average() < 0 ? 0 : average - buffer.average();
                            sound.noise = average - sound.normalized;

                            sound.minSoundLevel_normalized = sound.minSoundLevel - ((sound.noise / 180) * sound.minSoundLevel);
                            if (!sound.on) {
                                sound.max_normalized = sound.max - sound.noise;
                            }

                        } else {
                            buffer[sample++] = average;
                        }

                        if (!inited && sample > buffer_size) {
                            sample = 0;
                            inited = true;

                            document.dispatchEvent (dynamicLevel);
                        }

                        self.checkLevels ();
                    };
                },
                function () {
                    document.dispatchEvent (initFail);
                }
            );
        } else {
            document.dispatchEvent (initFail);
        }
    };

    /**
     * check sound levels
     *
     * dispatch events
     */
    this.checkLevels = function () {
        if (!sound.enable) {
            return false;
        }

        //start
        if (!sound.on && !sound.peek && sound.normalized > sound.minSoundLevel_normalized ) {
            sound.peek = true;
            sound.duration = 0;
            sound.start = Date.now ();
        }

        if (!sound.on && sound.peek && sound.normalized > sound.minSoundLevel_normalized ) {
            sound.duration = Date.now () - sound.start;
        }

        if (!sound.on && sound.peek && sound.duration > sound.minDeltaTime && sound.normalized > sound.minSoundLevel_normalized ) {
            sound.on = true;
            sound.start = Date.now ();

            var blowStart = new CustomEvent ('sound.blow.start', { detail: {
                level: sound.level,
                normalized: sound.normalized,
                noise: sound.noise,
                max: sound.max_normalized,
                duration: 0
            }});
            document.dispatchEvent (blowStart);
        }

        //during
        if (sound.on && sound.normalized > sound.minSoundLevel_normalized) {
            sound.duration = Date.now () - sound.start;

            var blowDuring = new CustomEvent ('sound.blow.during', { detail: {
                level: sound.level,
                normalized: sound.normalized,
                noise: sound.noise,
                max: sound.max_normalized,
                duration: sound.duration
            }});
            document.dispatchEvent (blowDuring);
        }

        //stop
        if (sound.on && sound.normalized < sound.minSoundLevel_normalized) {
            sound.on = false;
            sound.peek = false;
            sound.stop = Date.now ();
            sound.duration = sound.stop - sound.start;

            var blowStop = new CustomEvent ('sound.blow.stop', { detail: {
                level: sound.level,
                normalized: sound.normalized,
                noise: sound.noise,
                max: sound.max_normalized,
                duration: sound.duration
            }});
            document.dispatchEvent (blowStop);
        }

        //stop peek
        if (sound.peek && sound.normalized < sound.minSoundLevel_normalized) {
            sound.peek = false;
            sound.duration = 0;
        }
    };

    self.init ();
};