// needs async library support
var 
	async = require('async');

(function lifeCycle(){
	var 
	  workflow = {
			body : [],
			end  : function() {},
			util : {},
			conf : {}
		},
		msg = null;   // message the user want to send

	workflow.conf = {
		pError : 100    // just let the error occur
	}

	workflow.util.genError = function(){
		if (Math.floor(Math.random() * 100) < workflow.conf.pError) {
			return Math.floor(Math.random() * (msg.length - 1));
		}
		else {
			return null;
		}
	}

	// Check if num is power of 2
	workflow.util.is2pow = function(num){
		return !!((num & (num - 1)) == 0);
	}

	workflow.body.push(function readMessage(next){
		process.stdin.resume();
		console.log('Enter a short binary message (one line):');
		process.stdin.on('data', function(chunk){
			// Here I use Buffer class in Node.js instead of string
			msg = chunk;
			process.stdin.pause();
			next();
		});
	});

	workflow.body.push(function addParityCodes(next){
		var tmp = new Buffer(1000);
			 
		tmp.fill(0x0a);
		var 
			posInMsg = 0,
			tmpLen = 0;
		for (var i = 0; i < 1000; i ++) {
			// The real position for code at index i is (i + 1)
			// we now check if i + 1 is power of 2
			if (workflow.util.is2pow(i + 1)) {
				tmp[i] = 0xFF; // 0xFF is a placeholder for parity code
			}
			else {
				tmp[i] = msg[posInMsg];
				posInMsg ++;
				if (posInMsg === msg.length - 1) {
					// no more code
					tmpLen = i + 2;
					break;
				}
			}
		}

		// determine parity code
		var step = 1;
		for (var i = 0; i < tmpLen - 1; i ++) {
			if (tmp[i] != 0xFF) {
				continue;
			}

			var 
				result = 0, 
				j = i;
			while (j < tmpLen - 1) {
				for (var k = 0; k < step && j + k < tmpLen - 1; k ++) {
					if (tmp[j + k] > 49) {
						// the parity code itself
						continue;
					}
					result ^= (tmp[j + k] - 48);
				}
				j += (2 * step);
			}
			tmp[i] = result + 48;
			step *= 2;
		}

		// assign updated message
		var newMsg = new Buffer(tmpLen);
		tmp.copy(newMsg, 0, 0, tmpLen);
		msg = newMsg;
		console.log('The message with parity codes:\n' + msg.toString());

		next();
	});

	// Generate error randomly
	// the probability of error occurence is determined by conf.pError
	workflow.body.push(function makeError(next){
		var errorIndex = workflow.util.genError();
		if (errorIndex) {
			msg[errorIndex] = msg[errorIndex] === 49 ? 48 : 49;
			console.log('Error occurred at position: ' + (errorIndex+1));
		}
		console.log('Received message:\n' + msg);
		next();
	});

	// Check for the single bit error
	// if the error occurred, then correct it!
	workflow.body.push(function errorProcess(next){
		var step = 1,
				errorIndex = 0;
		for (var i = 0; i < msg.length - 1; i ++) {
			if (! workflow.util.is2pow(i + 1)) {
				continue;
			}

			var 
				result = 0, 
				j = i;
			while (j < msg.length - 1) {
				for (var k = 0; k < step && j + k < msg.length - 1; k ++) {
					result ^= (msg[j + k] - 48);
				}
				j += (2 * step);
			}

			if (result != 0) {
				// error spotted
				errorIndex += step;
			}

			step *= 2;
		}

		if (errorIndex > 0) {
			console.log('Error founded at index:', errorIndex);
			msg[errorIndex - 1] = msg[errorIndex - 1] == 48 ? 49 : 48;
		}

		console.log('The message is:\n' + msg.toString());
		next();
	});

	workflow.end = function(err){
		if (err) {
			throw err;
		}
		else {
			console.log('--------------------------------------');
			lifeCycle();
		}
	}

	async.series(workflow.body, workflow.end);
})();
