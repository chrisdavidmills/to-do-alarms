// create a reference to the notifications list in the bottom of the app; we will write database messages into this list by
//appending list items on to the inner HTML of this variable - this is all the lines that say note.innerHTML += '<li>foo</li>';
var note = document.getElementById('notifications');

// create an instance of a db object for us to store the IDB data in
var db;

// create a blank instance of the object that is used to transfer data into the IDB. This is mainly for reference

var newAlarmId = 0;
var newItem = [
      { taskTitle: "", hours: 0, minutes: 0, day: 0, month: "", year: 0, notified: "no", alarmId: 0 }
    ];

// all the variables we need for the app    
var taskList = document.getElementById('task-list');

var taskForm = document.getElementById('task-form');
var title = document.getElementById('title');

var hours = document.getElementById('deadline-hours');
var minutes = document.getElementById('deadline-minutes');
var day = document.getElementById('deadline-day');
var month = document.getElementById('deadline-month');
var year = document.getElementById('deadline-year');

var submit = document.getElementById('submit');

window.onload = function() {
  note.innerHTML += '<li>App initialised.</li>';
  // In the following line, you should include the prefixes of implementations you want to test.
  window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  // DON'T use "var indexedDB = ..." if you're not in a function.
  // Moreover, you may need references to some window.IDB* objects:
  window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
  window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
  // (Mozilla has never prefixed these objects, so we don't need window.mozIDB*)


  // Let us open our database
  var DBOpenRequest = window.indexedDB.open("toDoListAlarms", 1);
   
  // Gecko-only IndexedDB temp storage option:
  // var request = window.indexedDB.open("toDoListAlarms", {version: 1, storage: "temporary"});

  // these two event handlers act on the database being opened successfully, or not
  DBOpenRequest.onerror = function(event) {
    note.innerHTML += '<li>Error loading database.</li>';
  };
  
  DBOpenRequest.onsuccess = function(event) {
    note.innerHTML += '<li>Database initialised.</li>';
    
    // store the result of opening the database in the db variable. This is used a lot below
    db = DBOpenRequest.result;
    
    // Run the displayData() function to populate the task list with all the to-do list data already in the IDB
    displayData();
  };
  
  // This event handles the event whereby a new version of the database needs to be created
  // Either one has not been created before, or a new version number has been submitted via the
  // window.indexedDB.open line above
  //it is only implemented in recent browsers
  DBOpenRequest.onupgradeneeded = function(event) { 
    var db = event.target.result;
    
    db.onerror = function(event) {
      note.innerHTML += '<li>Error loading database.</li>';
    };

    // Create an objectStore for this database
    
    var objectStore = db.createObjectStore("toDoListAlarms", { keyPath: "taskTitle" });
    
    // define what data items the objectStore will contain
    
    objectStore.createIndex("hours", "hours", { unique: false });
    objectStore.createIndex("minutes", "minutes", { unique: false });
    objectStore.createIndex("day", "day", { unique: false });
    objectStore.createIndex("month", "month", { unique: false });
    objectStore.createIndex("year", "year", { unique: false });

    objectStore.createIndex("notified", "notified", { unique: false });
    objectStore.createIndex("alarmId", "alarmId", { unique: false})
    
    note.innerHTML += '<li>Object store created.</li>';
  };
    
  function displayData() {
    // first clear the content of the task list so that you don't get a huge long list of duplicate stuff each time
    //the display is updated.
    taskList.innerHTML = "";
  
    // Open our object store and then get a cursor list of all the different data items in the IDB to iterate through
    var objectStore = db.transaction('toDoListAlarms').objectStore('toDoListAlarms');
    objectStore.openCursor().onsuccess = function(event) {
      var cursor = event.target.result;
        // if there is still another cursor to go, keep runing this code
        if(cursor) {
          // create a list item to put each data item inside when displaying it
          var listItem = document.createElement('li');
          
          // check which suffix the deadline day of the month needs
          if(cursor.value.day == 1 || cursor.value.day == 21 || cursor.value.day == 31) {
            daySuffix = "st";
          } else if(cursor.value.day == 2 || cursor.value.day == 22) {
            daySuffix = "nd";
          } else if(cursor.value.day == 3 || cursor.value.day == 23) {
            daySuffix = "rd";
          } else {
            daySuffix = "th";  
          }
          
          // build the to-do list entry and put it into the list item via innerHTML.
          listItem.innerHTML = cursor.value.taskTitle + ' — ' + cursor.value.hours + ':' + cursor.value.minutes + ', ' + cursor.value.month + ' ' + cursor.value.day + daySuffix + ' ' + cursor.value.year + '.';
          
          if(cursor.value.notified == "yes") {
            listItem.style.textDecoration = "line-through";
            listItem.style.color = "rgba(255,0,0,0.5)";
          }

          // put the item item inside the task list
          taskList.appendChild(listItem);  
          
          // create a delete button inside each list item, giving it an event handler so that it runs the deleteButton()
          // function when clicked
          var deleteButton = document.createElement('button');
          listItem.appendChild(deleteButton);
          deleteButton.innerHTML = 'X';
          // here we are setting a data attribute on our delete button to say what task we want deleted if it is clicked! 
          deleteButton.setAttribute('data-task', cursor.value.taskTitle);
          deleteButton.setAttribute('data-alarmId', cursor.value.alarmId);
          deleteButton.onclick = function(event) {
            deleteItem(event);
          }
          
          // continue on to the next item in the cursor
          cursor.continue();
        
        // if there are no more cursor items to iterate through, say so, and exit the function 
        } else {
          note.innerHTML += '<li>Entries all displayed.</li>';
        }
      }
    }
  
  // give the form submit button an event listener so that when the form is submitted the addData() function is run
  taskForm.addEventListener('submit',addData,false);
  
  function addData(e) {
    // prevent default - we don't want the form to submit in the conventional way
    e.preventDefault();
    
    // Stop the form submitting if any values are left empty. This is just for browsers that don't support the HTML5 form
    // required attributes
    if(title.value == '' || hours.value == null || minutes.value == null || day.value == '' || month.value == '' || year.value == null) {
      note.innerHTML += '<li>Data not submitted — form incomplete.</li>';
      return;
    } else {
      // test whether the Alarm API is supported - if so, we'll set a system alarm
      if(navigator.mozAlarms) {
        //build a date object out of the user-provided time and date information from the form submission
        var myAlarmDate  = new Date(month.value + " " + day.value + ", " + year.value + " " + hours.value + ":" + minutes.value + ":00");

        // The data object can contain any arbitrary data you want to pass to the alarm. Here I'm passing the name of the task
        var data = {
          task: title.value
        }

        // The "ignoreTimezone" string makes the alarm ignore timezones and always go off at the same time wherever you are
        var alarmRequest = navigator.mozAlarms.add(myAlarmDate, "ignoreTimezone", data);

        alarmRequest.onsuccess = function () {
          console.log("Alarm sucessfully scheduled");

          var allAlarmsRequest = navigator.mozAlarms.getAll();
          allAlarmsRequest.onsuccess = function() {
            newAlarmId = this.result[(this.result.length)-1].id;
          }
        };

        alarmRequest.onerror = function () { 
          console.log("An error occurred: " + this.error.name);
        };
      } else {
        note.innerHTML += '<li>Alarm not created - your browser does not support the Alarm API.</li>';
      };
      
      // grab the values entered into the form fields and store them in an object ready for being inserted into the IDB
      var newItem = [
        { taskTitle: title.value, hours: hours.value, minutes: minutes.value, day: day.value, month: month.value, year: year.value, notified: "no", alarmId: newAlarmId }
      ];

      // open a read/write db transaction, ready for adding the data
      var transaction = db.transaction(["toDoListAlarms"], "readwrite");
    
      // report on the success of opening the transaction
      transaction.oncomplete = function(event) {
        note.innerHTML += '<li>Transaction completed: database modification finished.</li>';
        console.log('transaction.oncomplete');
      };

      transaction.onerror = function(event) {
        note.innerHTML += '<li>Transaction not opened due to error. Duplicate items not allowed.</li>';
      };

      // call an object store that's already been added to the database
      var objectStore = transaction.objectStore("toDoListAlarms");
      // add our newItem object to the object store
      var objectStoreRequest = objectStore.add(newItem[0]);        
        objectStoreRequest.onsuccess = function(event) {
          console.log('objectStore add.onsuccess');
          
          // report the success of our new item going into the database
          note.innerHTML += '<li>New item added to database.</li>';
          
          // clear the form, ready for adding the next entry
          title.value = '';
          hours.value = null;
          minutes.value = null;
          day.value = 01;
          month.value = 'January';
          year.value = 2020;
          
        };
         
      };
      
      // update the display of data to show the newly added item, by running displayData() again.
      displayData(); 
    };
  
  function deleteItem(event) {
    // retrieve the name and the alarm ID of the task we want to delete
    var dataTask = event.target.getAttribute('data-task');
    var dataAlarm = event.target.getAttribute('data-alarmId');

    //delete the alarm associated with this task
    if(navigator.mozAlarms) {
      navigator.mozAlarms.remove(dataAlarm);
    }
    
    // delete the parent of the button, which is the list item, so it no longer is displayed
    event.target.parentNode.parentNode.removeChild(event.target.parentNode);
    
    // open a database transaction and delete the task, finding it by the name we retrieved above
    var deleteTaskRequest = db.transaction(["toDoListAlarms"], "readwrite").objectStore("toDoListAlarms").delete(dataTask);
    
    // report that the data item has been deleted
    deleteTaskRequest.onsuccess = function(event) {
      note.innerHTML += '<li>Task \"' + dataTask + '\" deleted.</li>';
    };
    
  }

  // This will handle an alarm set by this application
  if(navigator.mozSetMessageHandler) {
    navigator.mozSetMessageHandler("alarm", function (alarm) {
      // only launch a notification if the Alarm is of the right type for this app 
      if(alarm.data.task) {
        // Create a notification when the alarm is due
        new Notification("Your task " + alarm.data.task + " is now due!");
        updateNotified(alarm.data.task);
      }
    });

    // This should open the application when the user touches the notification
    // but it only works on later FxOS versions, e.g. 2.0/2.1
    navigator.mozSetMessageHandler("notification", function (message) {
      if (!message.clicked) { return; }

      navigator.mozApps.getSelf().onsuccess = function (evt) {
        var app = this.result;
        app.launch();
      };
    })
  }

  // function for updating the notified status of the task, in the IndexedDB
  function updateNotified(title) {

    // Here we need to update the value of notified to "yes" in this particular data object, so the
    // notification won't be set off on it again

    // first open up a transaction as usual
    var objectStore = db.transaction(['toDoListAlarms'], "readwrite").objectStore('toDoListAlarms');

    // get the to-do list object that has this title as it's title
    var ObjectStoreTitleRequest = objectStore.get(title);

    ObjectStoreTitleRequest.onsuccess = function() {
      // grab the data object returned as the result
      var data = ObjectStoreTitleRequest.result;
      
      // update the notified value in the object to "yes"
      data.notified = "yes";
      
      // create another request that inserts the item back into the database
      var updateTitleRequest = objectStore.put(data);
      
      // when this new request succeeds, run the displayData() function again to update the display
      updateTitleRequest.onsuccess = function() {
        displayData();
      }
    }
  }

}