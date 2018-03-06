// Feel free to try out the game at:
// https://speed-test-the-game.firebaseapp.com

$(document).ready( function() {

   // Initializing Firebase
   firebase.initializeApp({
      apiKey: "AIzaSyAm705nldrTOH-idb0HjTPSR5f5WE75qoE",
      authDomain: "speed-test-the-game.firebaseapp.com",
      databaseURL: "https://speed-test-the-game.firebaseio.com",
      projectId: "speed-test-the-game",
      storageBucket: "speed-test-the-game.appspot.com",
      messagingSenderId: "307943789958"
   });

   // Initialize Cloud Firestore through Firebase
   var db = firebase.firestore();

   // introducing global variables
   var score;
   var index;
   var sequence;
   var timer;
   var myInterval;
   var gameStarted;
   var increaseSpeed;
   var prevScoreRow = 0;
   var unLoggedPersonalHigh = 0;

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
   loadData("");
   $("#score").sevenSeg({ digits: 3, value: null });
   $("#highscores").collapse("show");
   $("#buttonHighscores").attr("disabled", true);
   $(".col-xs-5.collapse").collapse("show");
   $("#userInfo").collapse("show");
   $("#personalBest").collapse("show");


   // loading high scores from database
   function loadData(timecode) {
      if (db.collection("highscores") != undefined)
      {
         db.collection("highscores").orderBy("score", "desc").limit(10).get()
         .then(function(querySnapshot) {
            var i = 1;
            querySnapshot.forEach(function(doc) {
               // doc.data() is never undefined for query doc snapshots
               console.log(doc.id, " => ", doc.data());
               $("#row" + (i) + "cell1").text(doc.data().score);
               $("#row" + (i) + "cell2").text(doc.data().time);
               
                  
               // highlights the new score that was just added to the table
               if (doc.data().time === timecode)
               {
                  prevScoreRow = i;
                  $(".row" + prevScoreRow).addClass("highlighted");
               }
               i += 1;
            });
         }).catch(function(error) {
            console.log("Error getting documents: ", error);
         });
      }
   };


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

      // saves the score into database
      var dateAndTime = new Date().toLocaleString("en-GB");
      var user = firebase.auth().currentUser;

      if (user != null) {
         db.collection("highscores").add({
            score: score,
            time: dateAndTime,
            user: user.uid
         })
         .then(function(docRef) {
         console.log("Document written with ID: ", docRef.id);
         })
         .catch(function(error) {
            console.error("Error adding document: ", error);
         });

         personalHigh(user);

      } else {
         db.collection("highscores").add({
            score: score,
            time: dateAndTime
         })
         .then(function(docRef) {
         console.log("Document written with ID: ", docRef.id);
         })
         .catch(function(error) {
            console.error("Error adding document: ", error);
         });

         if (unLoggedPersonalHigh < score) {
            unLoggedPersonalHigh = score;
            $("#personalBest").text("Personal Best: " + unLoggedPersonalHigh);
         }
      }

      // updates the score board
      loadData(String(dateAndTime));
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
            $(".loginButtons").css('visibility','visible');
            $(".col-xs-5.collapse").collapse("show");
            $("#userInfo").collapse("show");
            $("#personalBest").collapse("show");
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
         $(".loginButtons").css('visibility','hidden');

         $(".buttons button").css("font-size", "0");
         $("#scoreHeader").css("color", "red");
         $("#score").sevenSeg({ value: score });

         timer = setInterval(gameLoop, myInterval); // starts the game
      }
   }


   $("#buttonStart").click( function() {
      startPressed();
   });

   $("#buttonLogin").click( function() {
      var width = 400; // login window width in pixels
      var height = 500; // login window height in pixels

      var positionLeft = $(document).width()/2 - width/2;
      var positionTop = $(document).height()/2 - height/2;

      window.open('login.html', 'LoginWindow',
         'width='+width+',height='+height+',left='+positionLeft+',top='+positionTop);
   });

   $("#buttonLogout").click( function() {
      firebase.auth().signOut();
   });

   $("#buttonDelete").click( function() {
      firebase.auth().currentUser.delete().catch(function(error) {
       if (error.code == 'auth/requires-recent-login') {
         // The user's credential is too old, new login is needed.
         firebase.auth().signOut().then(function() {
           // The timeout allows the message to be displayed after the UI has
           // changed to the signed out state.
           setTimeout(function() {
             alert('Please sign in again to delete your account.');
           }, 1);
         });
       }
     });
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

      // saves the updated key configuration into database IF user is logged in
      var user = firebase.auth().currentUser;

      if (user != null) {

         db.collection("settings").where("user", "==", user.uid).get()
         .then(function(querySnapshot) {
            if (querySnapshot.empty) {
               // player doesn't have any previous saves
               db.collection("settings").add({
                  keyconfig: [key1, key2, key3, key4, key5],
                  user: user.uid
               })
               .then(function(docRef) {
                  console.log("Document written with ID: ", docRef.id);
               })
               .catch(function(error) {
                  console.error("Error adding document: ", error);
               });
            } else {
               db.collection("settings").where("user", "==", user.uid).get()
               .then(function(querySnapshot) {
                  querySnapshot.forEach(function(doc) {
                     // player has a previous save -> modify it
                     doc.ref.set({
                        keyconfig: [key1, key2, key3, key4, key5],
                        user: user.uid
                     })
                     .then(function(docRef) {
                        console.log("Document (over)written with ID: ", docRef.id);
                     })
                     .catch(function(error) {
                        console.error("Error adding document: ", error);
                     });
                  });
               });
            }
         }).catch(function(error) {
            console.log("Error getting documents: ", error);
         });

      } else {
         console.log("User not logged in, settings not saved.");
      } 
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


   // searches the highest score for currently logged in player from the database
   function personalHigh(user) {
      db.collection("highscores").where("user", "==", user.uid).orderBy("score", "desc").limit(1).get()
      .then(function(querySnapshot) {
         querySnapshot.forEach(function(doc) {
               console.log("Personal Best: " + doc.data().score);
               $("#personalBest").text("Personal Best: " + doc.data().score);
               return;
         });
      }).catch(function(error) {
         console.log("Error getting documents: ", error);
      });
   }
   

   // loads user specific settings and high scores + changes UI to logged in mode
   function handleSignedInUser(user) {
      $("#userInfo").text("Logged in as: " + user.displayName);
      $("#buttonLogout").show();
      $("#buttonDelete").show();
      $("#buttonLogin").hide();

      db.collection("settings").where("user", "==", user.uid).limit(1).get()
      .then(function(querySnapshot) {
         querySnapshot.forEach(function(doc) {
            if (doc.data().keyconfig != undefined) {
               console.log("Settings loaded: " + doc.data().keyconfig);

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
         });
      }).catch(function(error) {
         console.log("Error getting documents: ", error);
      });

      personalHigh(user);     
   }

   // resets the game to default settings, removing any customizations made by authenticated player
   function handleSignedOutUser() {
      $("#userInfo").text("Not logged in. (key configuration and personal high score won't be saved)");
      $("#buttonLogout").hide();
      $("#buttonDelete").hide();
      $("#buttonLogin").show();

      $("#personalBest").text("Personal Best:");
      $("#buttonRestore").click();
      $("#buttonSave").click();
      unLoggedPersonalHigh = 0;
   }

   // Listen to change in auth state so it displays the correct UI for when
   // the user is signed in or not.
   firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
         handleSignedInUser(user);
      } else {
         handleSignedOutUser();
      }
      
   });

});