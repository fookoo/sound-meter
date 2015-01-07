# sound-meter
sound level meter js library

it was designed for detecting "blow" or just high level on mic.

## usage
create instance of soundMeterCtrl

> var instance = new soundMeterCtrl ();

and then listen to events on document element.

## events

### sound.init.ok

this event means that sound initialization goes ok, and user allow us to usemicrophone

### sound.init.fail

this event means that sound initialization goes wrong, or user declaim access to microphone

### sound.blow.start

this event means that sound level is higher than minimal threshold, this threshold could be set by minSoundLevel param

### sound.blow.during

this event means that sound level is higher than minimal threshold and sound.blow.start was already triggered

### sound.blow.stop

this event means that sound level dropped below minimal threshold

### sound.dynamic.level

this event means that dynamic noise level is calculated and can be used