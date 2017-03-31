/* jshint esversion: 6 */  // (for const)

$(document).ready( function() {
   "use strict";

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

   // shoddy enum substitute
   const MessageType = {
      ERROR: 0,
      SCORE: 1,
      SAVE: 2,
      LOAD: 3,
      LOAD_REQUEST: 4,
      SETTINGS: 5
   };

   // 820/300/0.99 -> max speed achieved on 100th (820*0.99^x = 300)
   const MAX_INTERVAL = 820;
   const MIN_INTERVAL = 300; // minimum interval in ms
   const INTERVAL_DECREASE_RATIO = 0.99;

   postMessage(MessageType.LOAD_REQUEST);
   $("#score").sevenSeg({ digits: 3, value: null });
   $("#highscores").collapse("show");
   $("#buttonHighscores").attr("disabled", true);
   $(".col-xs-5.collapse").collapse("show");

   function postMessage(messageType) {
      var message;

      switch (messageType) {
         case MessageType.SCORE:
            message = {
               "messageType": "SCORE",
               "score": score
            };
            console.log("Submit: " + message.messageType + ", " + message.score); // for testing
            break;

         case MessageType.SAVE:
            message =  {
               "messageType": "SAVE",
               "gameState": {
                  "keyConfig": [key1, key2, key3, key4, key5],
                  "highScores": scoresArr
               }
            };
            console.log("Save: " + JSON.stringify(message.gameState)); // for testing
            break;

         case MessageType.LOAD_REQUEST:
            message = {
               "messageType": "LOAD_REQUEST"
            };
            console.log("Load request"); // for testing
            console.log("Requested frame size: 824x824px"); // for testing
            break;

         case MessageType.SETTINGS:
            message =  {
               "messageType": "SETTING",
               "options": {
                  "width": 824, // in pixels
                  "height": 824 // in pixels
               }
            };
            break;
      }
      window.parent.postMessage(message, "*"); // common for all cases, hence outside the switch statement
   }

   window.addEventListener("message", function(event) {
      if(event.data.messageType === "LOAD") {
         key1 = event.data.gameState.keyConfig[0];
         key2 = event.data.gameState.keyConfig[1];
         key3 = event.data.gameState.keyConfig[2];
         key4 = event.data.gameState.keyConfig[3];
         key5 = event.data.gameState.keyConfig[4];

         scoresArr = event.data.gameState.highScores;

      } else if (event.data.messageType === "ERROR") {
         alert(event.data.info);
      }
      postMessage(MessageType.SETTINGS);
   });

   function gameLoop() {
      $(".buttons button").fadeTo(50, 0.5); // reset button opacity

      if (increaseSpeed) {
         increaseSpeed = false;
         clearTimeout(timer);
         timer = setInterval(gameLoop, myInterval);
      }

      var randNum;
      do {
         randNum = Math.floor((Math.random() * 4) + 1); // generates a random number between 1 and 4
      } while (sequence.length !== 0 && randNum === sequence[sequence.length - 1]); // to always light up different light than last time

      sequence.push(randNum);

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
         default: // should not end up in here
      }
   }

   function gameProceed() {
      index += 1;
      score += 1;
      $("#score").sevenSeg({ value: score });

      if (myInterval > MIN_INTERVAL) {
         myInterval *= INTERVAL_DECREASE_RATIO;

         if (myInterval < MIN_INTERVAL) {
            myInterval = MIN_INTERVAL;
         }

         increaseSpeed = true;
      }
   }

   function updateHighScores() {
      var dateAndTime = new Date().toLocaleString("en-GB");
      scoresArr.push({score: score, date: dateAndTime});

      // sorts by score into descending order and with equals favors the newest one
      scoresArr.sort(function(a, b) {
         return b.score - a.score || b.date.localeCompare(a.date);
      });

      scoresArr = scoresArr.slice(0, 10);

      for (var i = 0; i < scoresArr.length; i++) {
         $("#row" + (i + 1) + "cell1").text(scoresArr[i].score);
         $("#row" + (i + 1) + "cell2").text(scoresArr[i].date);

         if (scoresArr[i].score === score && scoresArr[i].date === dateAndTime)
         {
            prevScoreRow = i + 1;
            $(".row" + prevScoreRow).addClass("highlighted");
         }
      }
      postMessage(MessageType.SCORE);
      postMessage(MessageType.SAVE);
   }

   function buttonPressed(buttonNumber) {
      if (gameStarted) {
         if (sequence[index] === buttonNumber) {
            gameProceed();
         }
         else { // Game Over!
            clearTimeout(timer);
            $(".buttons button").fadeTo(1, 0.5);
            $(".buttons button").css("font-size", "inherit");
            $(".menuButtons").show();
            $(".col-xs-5.collapse").collapse("show");
            $("#highscores").collapse("show");
            $("#buttonHighscores").attr("disabled", true);
            updateHighScores();
            gameStarted = false;
         }
      }
   }

   function startPressed() {
      if (!gameStarted) { // redundant atm (button is hidden after pressing)

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

   $("#buttonSettings").click( function() {
      $("#buttonSettings").attr("disabled", true);
      $("#buttonHighscores").attr("disabled", false);

      $("#highscores").collapse("hide");
      $("#settings").collapse("show");
   });

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

      postMessage(MessageType.SAVE);
   });

   // Restore default keys
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
         default: // should not end up in here
      }
   });

});
