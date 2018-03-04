// Feel free to try out the game at:
// https://speed-test-the-game.firebaseapp.com

$(document).ready( function() {

   // Initializing Firebase
   var config = {
   apiKey: "AIzaSyAm705nldrTOH-idb0HjTPSR5f5WE75qoE",
   authDomain: "speed-test-the-game.firebaseapp.com",
   databaseURL: "https://speed-test-the-game.firebaseio.com",
   projectId: "speed-test-the-game",
   storageBucket: "speed-test-the-game.appspot.com",
   messagingSenderId: "307943789958"
   };
   firebase.initializeApp(config);
   var firestore = firebase.firestore();
   const docRef = firestore.doc("app/data");

   // introducing global variables
   var score;
   var index;
   var sequence;
   var timer;
   var myInterval;
   var gameStarted;
   var increaseSpeed;
   var scoresArr = [];
   var prevScoreRow = 0;

   // Keyboard defaults
   var key1 = 86; // V
   var key2 = 66; // B
   var key3 = 78; // N
   var key4 = 77; // M
   var key5 = 75; // K

   // 820/300/0.99 -> max speed achieved on 100th (820*0.99^x = 300)
   const MAX_INTERVAL = 820; // maximum interval in ms
   const MIN_INTERVAL = 300; // minimum interval in ms
   const INTERVAL_DECREASE_RATIO = 0.99;

   // setting up the game at startup
   loadData();
   $("#score").sevenSeg({ digits: 3, value: null });
   $("#highscores").collapse("show");
   $("#buttonHighscores").attr("disabled", true);
   $(".col-xs-5.collapse").collapse("show");


   // loading the key layout and high scores from database
   function loadData() {
   	docRef.get().then(function (doc) {
	      if (doc && doc.exists) {
	      	if (doc.data().keyconfig != undefined) {
		   	   key1 = doc.data().keyconfig[0];
			      $("#reassign1").attr("placeholder", String.fromCharCode(key1));
			      $("#button1").text(String.fromCharCode(key1));

			      key2 = doc.data().keyconfig[1];
			      $("#reassign2").attr("placeholder", String.fromCharCode(key2));
			      $("#button2").text(String.fromCharCode(key2));

			      key3 = doc.data().keyconfig[2];
			      $("#reassign3").attr("placeholder", String.fromCharCode(key3));
			      $("#button3").text(String.fromCharCode(key3));

			      key4 = doc.data().keyconfig[3];
			      $("#reassign4").attr("placeholder", String.fromCharCode(key4));
			      $("#button4").text(String.fromCharCode(key4));

			      key5 = doc.data().keyconfig[4];
			      $("#reassign5").attr("placeholder", String.fromCharCode(key5));
			      $("#buttonStart").text("Start (" + String.fromCharCode(key5) + ")");
		   	}

		   	if (doc.data().highscores != undefined) {
			      scoresArr = doc.data().highscores;

			      // populating the high score table
			      for (var i = 0; i < scoresArr.length; i++) {
			         $("#row" + (i + 1) + "cell1").text(scoresArr[i].score);
			         $("#row" + (i + 1) + "cell2").text(scoresArr[i].date);
			      }
		   	}
	      }
	   }).catch(function (error) {
	      console.log("An error has occurred: ", error);
	   });
   };


   // saves the data into database
   function save() {
   	docRef.set({
         highscores: scoresArr,
         keyconfig: [key1, key2, key3, key4, key5]
      }).catch(function (error) {
         console.log("An error has occurred: ", error);
      });
   }


   // function that gets periodically called as long as the game is running (correct buttons have been pressed)
   // - increases speed of the game
   // - randomly decides the next button that is going to light up
   function gameLoop() {
      $(".buttons button").fadeTo(50, 0.5); // reset button opacity

      // new interval for button light up is taken into use
      if (increaseSpeed) {
         increaseSpeed = false;
         clearTimeout(timer);
         timer = setInterval(gameLoop, myInterval);
      }

      // randomly generates a number that'll determine which button will light up next
      var randNum;
      do {
         randNum = Math.floor((Math.random() * 4) + 1); // generates a random number between 1 and 4
      } while (sequence.length !== 0 && randNum === sequence[sequence.length - 1]); // to always light up different light than last time

      sequence.push(randNum); // adding button to the sequence of upcoming buttons

      // lights up the next button that was just drawn
      switch (randNum) {
         case 1:
            $("#button1").fadeTo(50, 1);
            break;
         case 2:
            $("#button2").fadeTo(50, 1);
            break;
         case 3:
            $("#button3").fadeTo(50, 1);
            break;
         case 4:
            $("#button4").fadeTo(50, 1);
            break;
      }
   }


   // the correct button was pressed -> game keeps running
   // - updates the score
   // - sets the new interval (not taken into use yet)
   function gameProceed() {
      index += 1;
      score += 1;
      $("#score").sevenSeg({ value: score });

      if (myInterval > MIN_INTERVAL) {
         myInterval *= INTERVAL_DECREASE_RATIO;

         // if new interval would be less than specified minimum -> reverts to minimum
         if (myInterval < MIN_INTERVAL) {
            myInterval = MIN_INTERVAL;
         }

         increaseSpeed = true;
      }
   }


   // adds the newest score into high scores and updates the order
   function updateHighScores() {
      var dateAndTime = new Date().toLocaleString("en-GB");
      scoresArr.push({score: score, date: dateAndTime});

      // sorts by score into descending order and with equals favors the newest one
      scoresArr.sort(function(a, b) {
         return b.score - a.score || b.date.localeCompare(a.date);
      });

      // only top 10 scores are being stored
      scoresArr = scoresArr.slice(0, 10);

      // populating the high score table
      for (var i = 0; i < scoresArr.length; i++) {
         $("#row" + (i + 1) + "cell1").text(scoresArr[i].score);
         $("#row" + (i + 1) + "cell2").text(scoresArr[i].date);

         // highlights the new score that was just added to the table
         if (scoresArr[i].score === score && scoresArr[i].date === dateAndTime)
         {
            prevScoreRow = i + 1;
            $(".row" + prevScoreRow).addClass("highlighted");
         }
      }

      // saves the updated high score list into database
      save();
   }


   // checks if the game has been started and then:
   // 1. correct button was pressed -> calls another function that handles the rest
   // 2. wrong button was pressed -> finishes the game
   function buttonPressed(buttonNumber) {
      if (gameStarted) {
         if (sequence[index] === buttonNumber) {
            gameProceed();
         }
         else { // Game Over!
            clearTimeout(timer);
            $(".buttons button").fadeTo(1, 0.5); // resets button opacity
            $(".buttons button").css("font-size", "inherit");
            $(".menuButtons").show();
            $(".col-xs-5.collapse").collapse("show");
            $("#lenny").text("( ͡° ͜ʖ ͡°)");
            $("#highscores").collapse("show");
            $("#buttonHighscores").attr("disabled", true);
            updateHighScores();
            gameStarted = false;
         }
      }
   }


   // initializes and starts the game
   function startPressed() {
      if (!gameStarted) {

         // initializing the game
         gameStarted = true;
         increaseSpeed = false;
         score = 0;
         index = 0;
         sequence = [];
         myInterval = MAX_INTERVAL; // starting interval in ms
         $(".row" + (prevScoreRow)).removeClass("highlighted");

         $("#buttonSettings").attr("disabled", false);
         $(".collapse").collapse("hide");
         $(".menuButtons").hide();

         $(".buttons button").css("font-size", "0");
         $("#scoreHeader").css("color", "red");
         $("#score").sevenSeg({ value: score });

         timer = setInterval(gameLoop, myInterval); // starts the game
      }
   }


   $("#buttonStart").click( function() {
      startPressed();
   });

   // - disables the settings button & expands settings view
   // - enables the high score button & collapses high score view
   $("#buttonSettings").click( function() {
      $("#buttonSettings").attr("disabled", true);
      $("#buttonHighscores").attr("disabled", false);

      $("#highscores").collapse("hide");
      $("#settings").collapse("show");
   });

   // - disables the high score button & expands high score view
   // - enables the settings button & collapses settings view
   $("#buttonHighscores").click( function() {
      $("#buttonHighscores").attr("disabled", true);
      $("#buttonSettings").attr("disabled", false);

      $("#settings").collapse("hide");
      $("#highscores").collapse("show");
   });


   // 0-9 or A-Z
   function letterOrNumber(input) {
      if ((48 <= input && input <= 57) || (65 <= input && input <= 90))
      {
         return true;
      }
      else {
         return false;
      }
   }
   

   // changes the key configuration to one specified by user
   $("#buttonSave").click( function() {
      var input = $("#reassign1").val().toUpperCase().charCodeAt(0);
      if (letterOrNumber(input))
      {
         key1 = input;
         $("#button1").text(String.fromCharCode(key1));

         $("#reassign1").attr("placeholder", String.fromCharCode(key1) );
         $("#reassign1").val("");
      }

      input = $("#reassign2").val().toUpperCase().charCodeAt(0);
      if (letterOrNumber(input))
      {
         key2 = input;
         $("#button2").text(String.fromCharCode(key2));

         $("#reassign2").attr("placeholder", String.fromCharCode(key2) );
         $("#reassign2").val("");
      }

      input = $("#reassign3").val().toUpperCase().charCodeAt(0);
      if (letterOrNumber(input))
      {
         key3 = input;
         $("#button3").text(String.fromCharCode(key3));

         $("#reassign3").attr("placeholder", String.fromCharCode(key3) );
         $("#reassign3").val("");
      }

      input = $("#reassign4").val().toUpperCase().charCodeAt(0);
      if (letterOrNumber(input))
      {
         key4 = input;
         $("#button4").text(String.fromCharCode(key4));

         $("#reassign4").attr("placeholder", String.fromCharCode(key4) );
         $("#reassign4").val("");
      }

      input = $("#reassign5").val().toUpperCase().charCodeAt(0);
      if (letterOrNumber(input))
      {
         key5 = input;
         $("#buttonStart").text("Start (" + String.fromCharCode(key5) + ")");

         $("#reassign5").attr("placeholder", String.fromCharCode(key5) );
         $("#reassign5").val("");
      }

      // saves the updated key configuration into database
      save();
   });


   // Restores default keys
   $("#buttonRestore").click( function() {
      $("#reassign1").val("V");
      $("#reassign2").val("B");
      $("#reassign3").val("N");
      $("#reassign4").val("M");
      $("#reassign5").val("K");
   });


   $("#button1").click( function() {
      buttonPressed(1);
   });

   $("#button2").click( function() {
      buttonPressed(2);
   });

   $("#button3").click( function() {
      buttonPressed(3);
   });

   $("#button4").click( function() {
      buttonPressed(4);
   });


   $(document).keydown(function(e) {
      switch (e.keyCode) {
         case key1:
            buttonPressed(1);
            break;
         case key2:
            buttonPressed(2);
            break;
         case key3:
            buttonPressed(3);
            break;
         case key4:
            buttonPressed(4);
            break;
         case key5:
            startPressed();
            break;
      }
   });

});