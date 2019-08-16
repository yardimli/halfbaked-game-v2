class ClockTimer {
	constructor(canvas, config = {}) {
		this.ctx = canvas.getContext('2d');
		this.objType = 'ClockTimer'; // Mark the object type.
		this.updateTimer = null;
		this.blinkTimer = null;

		// pos
		this.x = parseInt(canvas.width/2);
		this.y = parseInt(canvas.height/2);

		// status
		this.needsUpdateFrame = false;
		this.status = 'ready' ;
		this.direction = config.hasOwnProperty('direction') ? (config.direction >= 0 ? 1 : -1) : 1 ;

		// const
		this.time = config.hasOwnProperty('time') ? config.time : 60 ; // seconds
		this.curtTime = this.direction === 1 ? 0 : this.time;
		this.speed = config.hasOwnProperty('speed') ? config.speed : 1000 ; // milliseconds
		this.degProgress = this.direction === 1 ? 0 : 360;
		this.size = parseInt(canvas.width/2);
		this.originSize = parseInt(canvas.width/2);

		// style
		this.startColor = config.hasOwnProperty('startColor') ? config.startColor : 'rgb(0, 255, 0)';
		this.middleColor = config.hasOwnProperty('middleColor') ? config.middleColor : 'rgb(255, 255, 0)';
		this.endColor = config.hasOwnProperty('endColor') ? config.endColor : 'rgb(255, 0, 0)';
		this.gradients = this.interpolateColors(this.startColor, this.middleColor, 180).concat( this.interpolateColors(this.middleColor, this.endColor, 180) );
		this.textStyle = config.hasOwnProperty('textStyle') ? config.textStyle : '12px Arial';
		this.textColor = config.hasOwnProperty('textColor') ? config.textColor : '#000';

		return this;
	}

	startTimer(){

		this.drawTimer();
		this.needsUpdateFrame = true;
		this.status = 'running';

		this.updateTimer = window.setInterval(function (ClockTimer) {
			if (ClockTimer.direction === 1) {
				if (ClockTimer.curtTime < ClockTimer.time) {
					ClockTimer.curtTime++;
					ClockTimer.degProgress += (360 / ClockTimer.time);
					if( ClockTimer.degProgress > 270 && ClockTimer.blinkTimer === null) {
						ClockTimer.startBlink();
					}
					ClockTimer.drawTimer();
					ClockTimer.needsUpdateFrame = true;
				}else if (ClockTimer.curtTime === ClockTimer.time) {
					ClockTimer.status = 'stop';
					window.clearInterval(ClockTimer.updateTimer);
					window.clearInterval(ClockTimer.blinkTimer);
				}
			}
			if (ClockTimer.direction === -1) {
				if (ClockTimer.curtTime > 0) {
					ClockTimer.curtTime--;
					ClockTimer.degProgress -= (360 / ClockTimer.time);
					if( ClockTimer.degProgress < 90 && ClockTimer.blinkTimer === null) {
						ClockTimer.startBlink();
					}
					ClockTimer.drawTimer();
					ClockTimer.needsUpdateFrame = true;
				}else if (ClockTimer.curtTime === 0) {
					ClockTimer.status = 'stop';
					window.clearInterval(ClockTimer.updateTimer);
					window.clearInterval(ClockTimer.blinkTimer);
				}
			}

		}, this.speed, this);

	}

	startBlink(){

		this.blinkTimer = window.setInterval(function(ClockTimer) {
			if(ClockTimer.size === ClockTimer.originSize){
				ClockTimer.size = ClockTimer.size*0.8;
			}else if(ClockTimer.size !== ClockTimer.originSize){
				ClockTimer.size = ClockTimer.originSize
			}
			if(ClockTimer.curtTime === 0 || ClockTimer.curtTime === ClockTimer.time){
				// ClockTimer.size = ClockTimer.originSize;
			}
			ClockTimer.drawTimer();
			ClockTimer.needsUpdateFrame = true;
		}, 10, this)

	}

	drawTimer(){

		this.ctx.save();
		this.ctx.clearRect(0, 0, this.originSize*2, this.originSize*2);

		if(this.direction === 1){
			var colorIndex = Math.ceil(this.degProgress) < 360 ? Math.ceil(this.degProgress) : 359 ;
		}else if(this.direction === -1){
			var colorIndex = 360-Math.ceil(this.degProgress) < 360 ? 360-Math.ceil(this.degProgress) : 359 ;
		}
		
		//Draw Center Circle
		var grd = this.ctx.createRadialGradient(this.x, this.y, 5, this.x, this.y, this.size);
		grd.addColorStop(0, 'rgba(255, 255, 255, 1)');
		grd.addColorStop(0.5, 'rgba(' + this.gradients[colorIndex][0] + ', ' + this.gradients[colorIndex][1] + ', ' + this.gradients[colorIndex][2] + ', 1)');
		grd.addColorStop(0.7, 'rgba(' + this.gradients[colorIndex][0] + ', ' + this.gradients[colorIndex][1] + ', ' + this.gradients[colorIndex][2] + ', 0)');
		this.ctx.fillStyle = grd;

		this.ctx.beginPath();
		this.ctx.arc(this.x, this.y, this.size*0.7, 0, 2 * Math.PI);
		this.ctx.strokeStyle = 'rgba(0, 0, 0, 0)';
		this.ctx.lineWidth = 0;
		this.ctx.stroke();
		this.ctx.fill();

		//Draw Big Pizza
		grd = this.ctx.createRadialGradient(this.x, this.y, 5, this.x, this.y, this.size);
		grd.addColorStop(0, 'rgba(255, 255, 255, 1)');
		grd.addColorStop(0.7, 'rgba(' + this.gradients[colorIndex][0] + ', ' + this.gradients[colorIndex][1] + ', ' + this.gradients[colorIndex][2] + ', 1)');
		grd.addColorStop(1, 'rgba(' + this.gradients[colorIndex][0] + ', ' + this.gradients[colorIndex][1] + ', ' + this.gradients[colorIndex][2] + ', 0)');
		this.ctx.fillStyle = grd;

		if(this.degProgress !== 0){
			this.ctx.beginPath();
			if(this.degProgress === 360){
				this.ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
			}else {
				this.ctx.arc(this.x, this.y, this.size, 1.5 * Math.PI, this.toRad(this.degProgress-90));
			}
			this.ctx.lineTo(this.x, this.y);
			this.ctx.closePath();
			this.ctx.strokeStyle = 'rgba(0, 0, 0, 0)';
			this.ctx.lineWidth = 0;
			this.ctx.stroke();
			this.ctx.fill();
		}

		//Draw First Line
		this.ctx.beginPath();
		this.ctx.moveTo(this.x, this.y);
		this.ctx.lineTo(this.x, 0);
		this.ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
		this.ctx.lineWidth = 5;
		this.ctx.stroke();

		//Draw Second Line
		if(this.degProgress !== 0 && this.degProgress !== 360){
			this.ctx.beginPath();
			this.ctx.moveTo(this.x, this.y);
			if(this.direction === 1){
				this.ctx.lineTo(this.x + Math.cos(this.toRad(this.degProgress-90)) * this.size, this.y + Math.sin(this.toRad(this.degProgress-90)) * this.size);
			}else if(this.direction === -1){
				this.ctx.lineTo(this.x - Math.cos(this.toRad(this.degProgress+90)) * this.size, this.y - Math.sin(this.toRad(this.degProgress+90)) * this.size);
			}
			this.ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
			this.ctx.lineWidth = 5;
			this.ctx.stroke();
		}

		//Draw Text
		this.ctx.fillStyle = this.textColor;
		this.ctx.textAlign = 'center';
		this.ctx.textBaseline = 'middle';
		this.ctx.font = this.textStyle;
		this.ctx.fillText(this.curtTime, this.x, this.y);

		this.ctx.restore();

	}

	toRad(deg){
		return deg * Math.PI / 180;
	}

	interpolateColors(color1, color2, steps) {
		if (arguments.length < 3) return false;
		var stepFactor = 1 / (steps - 1), interpolatedColorArray = [];

		color1 = color1.match(/\d+/g).map(Number);
		color2 = color2.match(/\d+/g).map(Number);

		for(var i = 0; i < steps; i++) {
			var rgbs = color1.slice();
			for (var k = 0; k < 3; k++) {
				rgbs[k] = Math.round(rgbs[k] + (stepFactor * i) * (color2[k] - color1[k]));
			}
			interpolatedColorArray.push([rgbs[0], rgbs[1], rgbs[2]]);
		}

		return interpolatedColorArray;
	}

	hexToRgb(hex) {
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? 'rgb(' + parseInt(result[1], 16) + ', ' + parseInt(result[2], 16) + ', ' + parseInt(result[3], 16) + ')' : null;
	}

	rgbToHex(r, g, b) {
		return "#" + (r.toString(16).length == 1 ? "0" + r.toString(16) : r.toString(16)) + (g.toString(16).length == 1 ? "0" + g.toString(16) : g.toString(16)) + (b.toString(16).length == 1 ? "0" + b.toString(16) : b.toString(16));
	}

};
