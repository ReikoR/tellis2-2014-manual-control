var express = require('express'),
    app = express(),
    http = require('http'),
    server = http.createServer(app),
    io = require('socket.io').listen(server);

var serialport = require('serialport');
var SerialPort = serialport.SerialPort; // localize object constructor

var serialPort = new SerialPort('COM3', {
    baudrate: 230400,
    parser: serialport.parsers.readline('\n')
});

var speed = 0,
    step = 0.01,
    max = 0.5,
    min = 0,
    angle = 0,
    goState = 0,
    lastTime = Date.now();

serialPort.on('open', function () {
    console.log('open');
    serialPort.on('data', function (data) {
        console.log('data received: ' + data);
        
        var currentTime = Date.now();
        
        console.log(currentTime - lastTime);
        
        //serialPort.write('adc\n');
        
        lastTime = currentTime;
    });

    //drive(0, 0, 0);
    
    serialPort.write('adc\n');

    setInterval(function () {
        speed += step;

        if (step > 0 && speed >= max) {
            step = -step;
            //speed = max;
        } else if (step < 0 && speed <= min) {
            step = -step;
            //speed = min
        }

        //console.log(speed);

        /*serialPort.write('speeds:' + speed + ':' + speed + ':' + speed + ':' + speed + ':' + 0 + '\n', function (err, results) {
            //console.log('err ' + err);
            //console.log('results ' + results);
        });*/
        
        /*if (goState) {
            goState = 0;
        } else {
            goState = 1;
        }*/
        
        //serialPort.write('go:' + goState + '\n');
        

        angle += 0.1;

        if (angle >= 2 * Math.PI) {
            angle = 0;
        }
        
        
        drive(0, 0, 0);
        //drive(speed, angle, 0)
        //drive(Math.random() * 0.5, Math.random() * 2 * Math.PI, 0)
    }, 10);
    
    setInterval(function () {
        if (goState) {
            goState = 0;
        } else {
            goState = 1;
        }
    
        //serialPort.write('adc\n');
        serialPort.write('go:' + goState + '\n');
    }, 100);
});

serialPort.on('close', function () {
    console.log('close');
});
    
serialPort.on('error', function () {
    console.log('error');
});

serialPort.on('disconnect', function () {
    console.log('disconnect');
});

var pidFreq = 60,
    ticksPerRev = 1200,
    wheelCirc = 0.07 * Math.PI,
    wheelOffset = 0.117,
    metricToRobot = ticksPerRev / wheelCirc / pidFreq,
    maxSpeed = 2,
    maxRotation = 4,
    wheel1Angle = 135 / 180 * Math.PI,
    wheel2Angle = 45 / 180 * Math.PI,
    wheel3Angle = 225 / 180 * Math.PI,
    wheel4Angle = 315 / 180 * Math.PI,
    xSpeed = 0,
    ySpeed = 0,
    rotation = 0,
    wheel1Speed = 0,
    wheel2Speed = 0,
    wheel3Speed = 0,
    wheel4Speed = 0,
    dribblerSpeed = 0;

app.configure(function () {
    app.use(express.static(__dirname + '/public'));
});

server.listen(8083);

io.set('log level', 2);

io.sockets.on('connection', function (socket) {
    socket.on('drive', function (data) {
        data = data || {};
        drive(data.speed || 0, data.angle || 0, data.rotation || 0);
    });

    socket.on('dribbler', function (data) {
        data = data || {};
        dribbler(data.speed || 0);
    });

    socket.on('kick', function (data) {
        var strength = data.strength || 500;
        kick(strength);
    });
});

function drive(speed, angle, rotation) {
    var rotationalSpeed = speedMetricToRobot(rotationRadiansToMetersPerSecond(rotation));
    wheel1Speed = Math.round(speedMetricToRobot(wheelSpeed(speed, angle, wheel1Angle)) + rotationalSpeed);
    wheel2Speed = Math.round(speedMetricToRobot(wheelSpeed(speed, angle, wheel2Angle)) + rotationalSpeed);
    wheel3Speed = Math.round(speedMetricToRobot(wheelSpeed(speed, angle, wheel3Angle)) + rotationalSpeed);
    wheel4Speed = Math.round(speedMetricToRobot(wheelSpeed(speed, angle, wheel4Angle)) + rotationalSpeed);
    speeds = [wheel1Speed, wheel2Speed, wheel3Speed, wheel4Speed];
    //console.log(wheel1Speed, wheel2Speed, wheel3Speed, wheel4Speed);
    //var message = new Buffer('speeds:' + wheel1Speed + ':' + wheel2Speed + ':' + wheel3Speed + ':' + wheel4Speed + ':' + dribblerSpeed);
    //client.send(message, 0, message.length, serverPort, serverAddress);
    serialPort.write('speeds:' + wheel1Speed + ':' + wheel2Speed + ':' + wheel3Speed + ':' + wheel4Speed + ':' + dribblerSpeed + '\n');
}

function dribbler(speed) {
    dribblerSpeed = Math.round(speed);
    if (dribblerSpeed < -255) dribblerSpeed = 255;
    else if (dribblerSpeed > 255) dribblerSpeed = 255;
    console.log('Dribbler:', dribblerSpeed);
    //var message = new Buffer('speeds:' + wheel1Speed + ':' + wheel2Speed + ':' + wheel3Speed + ':' + wheel4Speed + ':' + dribblerSpeed);
    //client.send(message, 0, message.length, serverPort, serverAddress);
    serialPort.write('speeds:' + wheel1Speed + ':' + wheel2Speed + ':' + wheel3Speed + ':' + wheel4Speed + ':' + dribblerSpeed + '\n');
}

function kick(strength) {
    strength = strength || 500;
    console.log('Kick', strength);
    //var message = new Buffer('kick:' + strength);
    //client.send(message, 0, message.length, serverPort, serverAddress);
    //serialPort.write('kick:' + strength + '\n');
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