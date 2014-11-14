$(document).ready(function () {
    var gamepad = new Gamepad(),
        pidFreq = 60,
        ticksPerRev = 1200,
        wheelCirc = 0.07 * Math.PI,
        wheelOffset = 0.117,
        metricToRobot = ticksPerRev / wheelCirc / pidFreq,
        wheel1Angle = 135 / 180 * Math.PI,
        wheel2Angle = 45 / 180 * Math.PI,
        wheel3Angle = 225 / 180 * Math.PI,
        wheel4Angle = 315 / 180 * Math.PI,
        xSpeed = 0,
        ySpeed = 0,
        rotation = 0,
        dribblerSpeed = 0,
        dribblerOn = false,
        prevSentDribblerSpeed = 0,
        dribblerLimitsLower = 0.075,
        dribblerLimitsHigher = 0.075,
        dribblerLimitMin = 0.03,
        dribblerLimitMax = 0.125,
        dribblerLimitPeriod = 200,
        dribblerRepeatInterval = null,
        dribblerLimitLowerChange = 0,
        dribblerLimitHigherChange = 0,
        lastDribblerLimitTime = Date.now(),
        dribblerLimitChangingEnabled = false,
        backButton = false,
        driveTimeout = null,
		zAngle = 0,
		rotationChange = 0;

    window.maxSpeed = 2;
    window.maxRotation = 4;
    window.kickStrength = 5000;
    window.socket = io.connect();

    dribblerRepeatInterval = setInterval(function () {
        if (!(dribblerLimitLowerChange === 0 && dribblerLimitHigherChange === 0)) {
            dribblerLimitsLower += dribblerLimitLowerChange;

            if (dribblerLimitsLower > dribblerLimitMax) {
                dribblerLimitsLower = dribblerLimitMax;
            } else if (dribblerLimitsLower < dribblerLimitMin) {
                dribblerLimitsLower = dribblerLimitMin;
            }

            dribblerLimitsHigher += dribblerLimitHigherChange;

            if (dribblerLimitsHigher > dribblerLimitMax) {
                dribblerLimitsHigher = dribblerLimitMax;
            } else if (dribblerLimitsHigher < dribblerLimitMin) {
                dribblerLimitsHigher = dribblerLimitMin;
            }

            dribblerLimits();
        }
    }, dribblerLimitPeriod);

    $(window).blur(function() {
        console.log('window blur');
        socket.emit('drive', {speed: 0, angle: 0, rotation: 0});
        clearTimeout(driveTimeout);
    });

    socket.on('connect', function () {
        console.log('connect');
    });

    socket.on('disconnect', function () {
        console.log('disconnect');
    });

    socket.on('ready', function () {
        console.log('ready');
    });

    socket.on('not ready', function () {
        console.log('not ready');
    });

    function drive() {
        var rotationalSpeed = speedMetricToRobot(rotationRadiansToMetersPerSecond(rotation)),
            speed = Math.sqrt(xSpeed * xSpeed + ySpeed * ySpeed),
            angle = Math.atan2(xSpeed, ySpeed),
            wheel1Speed = speedMetricToRobot(wheelSpeed(speed, angle, wheel1Angle)) + rotationalSpeed,
            wheel2Speed = speedMetricToRobot(wheelSpeed(speed, angle, wheel2Angle)) + rotationalSpeed,
            wheel3Speed = speedMetricToRobot(wheelSpeed(speed, angle, wheel3Angle)) + rotationalSpeed,
            wheel4Speed = speedMetricToRobot(wheelSpeed(speed, angle, wheel4Angle)) + rotationalSpeed;
        $('#speed').html('Speed: ' + speed.toFixed(2) + ' m/s');
        $('#angle').html('Angle: ' + (angle * 180 / Math.PI).toFixed(1));
        $('#rotation').html('Rotation: ' + rotation.toFixed(2) + ' rad/s');
        $('#wheel1').html('Wheel1: ' + Math.round(wheel1Speed));
        $('#wheel2').html('Wheel2: ' + Math.round(wheel2Speed));
        $('#wheel3').html('Wheel3: ' + Math.round(wheel3Speed));
        $('#wheel4').html('Wheel4: ' + Math.round(wheel4Speed));
        socket.emit('drive', {speed: speed, angle: angle, rotation: rotation});
        if (driveTimeout) {
            clearTimeout(driveTimeout);
        }
        driveTimeout = setTimeout(function () {
            drive();
        }, 100);
    }

    function dribbler() {
        var speedDribbler = dribblerOn ? dribblerSpeed : 0;
        if (prevSentDribblerSpeed !== speedDribbler) {
            prevSentDribblerSpeed = speedDribbler;
            socket.emit('dribbler', {speed: -speedDribbler});
        }
        $('#dribbler').html('Dribbler: ' + speedDribbler);
    }

    function dribblerLimits() {
        //var currentDribblerLimitTime = Date.now();

        //if (currentDribblerLimitTime - lastDribblerLimitTime > dribblerLimitPeriod) {
            //lastDribblerLimitTime = currentDribblerLimitTime;
            console.log('dribblerLimitsLower', dribblerLimitsLower);
            console.log('dribblerLimitsHigher', dribblerLimitsHigher);
            $('#dribbler-limits').html('Dribbler limits: ' + dribblerLimitsLower.toFixed(3) + ' ' + dribblerLimitsHigher.toFixed(3));
            socket.emit('dribbler-limits', {lower: dribblerLimitsLower.toFixed(3), higher: dribblerLimitsHigher.toFixed(3)});
        //}
    }

    function kick() {
        socket.emit('kick', {strength: kickStrength});
    }

    function resetUsb() {
        console.log('reset usb');
        socket.emit('reset usb');
    }

    function wheelSpeed(robotSpeed, robotAngle, wheelAngle) {
        return robotSpeed * Math.cos(wheelAngle - robotAngle);
    }

    function speedMetricToRobot(metersPerSecond) {
        return metersPerSecond * metricToRobot;
    }

    function speedRobotToMetric(wheelSpeed) {
        return wheelSpeed / metricToRobot;
    }

    function rotationRadiansToMetersPerSecond(radiansPerSecond) {
        return radiansPerSecond * wheelOffset;
    }

    gamepad.bind(Gamepad.Event.CONNECTED, function(device) {
        console.log('Connected', device.id);
    });

    gamepad.bind(Gamepad.Event.DISCONNECTED, function(device) {
        console.log('Disconnected', device.id);
    });

    gamepad.bind(Gamepad.Event.UNSUPPORTED, function(device) {
        console.log('Unsupported controller connected', device);
    });

    gamepad.bind(Gamepad.Event.TICK, function(gamepads) {

    });

    gamepad.bind(Gamepad.Event.BUTTON_DOWN, function(e) {
        console.log(e);
        switch(e.control) {
            case 'LEFT_TOP_SHOULDER':
                dribblerOn = !dribblerOn;
                dribbler();
                break;
            case 'RIGHT_TOP_SHOULDER':
                kick();
                $('#kicker').html('KICK');
                break;
			case 'DPAD_DOWN':
                maxSpeed = 2;
				maxRotation = 4;
				console.log('maxSpeed', maxSpeed);
				console.log('maxRotation', maxRotation);
                break;
			case 'DPAD_LEFT':
                maxSpeed /= 2;
				maxRotation /= 2;
				console.log('maxSpeed', maxSpeed);
				console.log('maxRotation', maxRotation);
                break;
			case 'DPAD_RIGHT':
                maxSpeed *= 2;
				maxRotation *= 2;
				console.log('maxSpeed', maxSpeed);
				console.log('maxRotation', maxRotation);
                break;
            /*case 'LEFT_STICK':
                break;
            case 'RIGHT_STICK':
                break;*/
        }
    });

    gamepad.bind(Gamepad.Event.BUTTON_UP, function(e) {
        console.log(e);
        switch(e.control) {
            case 'RIGHT_TOP_SHOULDER':
                $('#kicker').html('');
                break;
            case 8:
                backButton = false;
                break;
            /*case 'LEFT_STICK':
                break;
            case 'RIGHT_STICK':
                break;*/
            case 'FACE_4':
                dribblerLimitChangingEnabled = !dribblerLimitChangingEnabled;

                $('#dribbler-limits').css({'font-weight': dribblerLimitChangingEnabled ? 'bold': 'normal'});

                break;
        }
    });

    gamepad.bind(Gamepad.Event.AXIS_CHANGED, function(e) {
        console.log(e);
        var prevDribblerSpeed = dribblerSpeed;
        switch(e.axis) {
            case 'LEFT_STICK_X':
                if (!dribblerLimitChangingEnabled) {
                    $('#rotate').html('Rotate: ' + e.value);
                    rotation = e.value * maxRotation;
                }
                break;
            case 'LEFT_STICK_Y':
                if (dribblerLimitChangingEnabled) {
                    //console.log(e.value);
                    dribblerLimitLowerChange = -e.value * 0.01;

                    if (Math.abs(dribblerLimitLowerChange) < 0.001) {
                        dribblerLimitLowerChange = 0;
                    }

                    //dribblerLimits();
                }
                break;
            case 'RIGHT_STICK_X':
                if (!dribblerLimitChangingEnabled) {
                    $('#side').html('X: ' + e.value);
                    xSpeed = e.value * maxSpeed;
                }
                break;
            case 'RIGHT_STICK_Y':
                if (!dribblerLimitChangingEnabled) {
                    $('#forward').html('Y: ' + (-e.value));
                    ySpeed = e.value * maxSpeed;
                } else {
                    dribblerLimitHigherChange = -e.value * 0.01;

                    if (Math.abs(dribblerLimitHigherChange) < 0.001) {
                        dribblerLimitHigherChange = 0;
                    }

                    //dribblerLimits();
                }
                break;
            case 'LEFT_BOTTOM_SHOULDER':
                dribblerSpeed = 255 * (0.95 - e.value);
                if (dribblerSpeed < 0) dribblerSpeed = 0;
                if (prevDribblerSpeed < dribblerSpeed) {
                    dribblerSpeed = prevDribblerSpeed;
                }
                dribbler();
                break;
            case 'RIGHT_BOTTOM_SHOULDER':
                dribblerSpeed = 255 * e.value;
                if (prevDribblerSpeed > dribblerSpeed) {
                    dribblerSpeed = prevDribblerSpeed;
                }
                dribbler();
                break;
        }
        if (e.axis === 'LEFT_STICK_X' || e.mapping === 'LEFT_STICK_Y' || e.mapping === 'RIGHT_STICK_Y') {
            drive();
        }
    });

    if (!gamepad.init()) {
        alert('Your browser does not support gamepads, get the latest Google Chrome or Firefox.');
    }
});
