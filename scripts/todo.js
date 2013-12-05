// create a reference to the notifications list in the bottom of the app; we will write database messages into this list by
//appending list items on to the inner HTML of this variable - this is all the lines that say note.innerHTML += '<li>foo</li>';
var note = document.getElementById('notifications');

// create an instance of a db object for us to store the IDB data in
var db;

// create a blank instance of the object that is used to transfer data into the IDB. This is mainly for reference
var newItem = [
      { taskTitle: "", hours: 0, minutes: 0, day: 0, month: "", year: 0, notified: "no" }
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
  var request = window.indexedDB.open("toDoList", 4);
   
  // Gecko-only IndexedDB temp storage option:
  // var request = window.indexedDB.open("toDoList", {version: 4, storage: "temporary"});

  // these two event handlers act on the database being opened successfully, or not
  request.onerror = function(event) {
    note.innerHTML += '<li>Error loading database.</li>';
  };
  
  request.onsuccess = function(event) {
    note.innerHTML += '<li>Database initialised.</li>';
    
    // store the result of opening the database in the db variable. This is used a lot below
    db = request.result;
    
    // Run the displayData() function to populate the task list with all the to-do list data already in the IDB
    displayData();
  };
  
  // This event handles the event whereby a new version of the database needs to be created
  // Either one has not been created before, or a new version number has been submitted via the
  // window.indexedDB.open line above
  //it is only implemented in recent browsers
  request.onupgradeneeded = function(event) { 
    var db = event.target.result;
    
    db.onerror = function(event) {
      note.innerHTML += '<li>Error loading database.</li>';
    };

    // Create an objectStore for this database
    
    var objectStore = db.createObjectStore("toDoList", { keyPath: "taskTitle" });
    
    // define what data items the objectStore will contain
    
    objectStore.createIndex("hours", "hours", { unique: false });
    objectStore.createIndex("minutes", "minutes", { unique: false });
    objectStore.createIndex("day", "day", { unique: false });
    objectStore.createIndex("month", "month", { unique: false });
    objectStore.createIndex("year", "year", { unique: false });

    objectStore.createIndex("notified", "notified", { unique: false });
    
    note.innerHTML += '<li>Object store created.</li>';
  };
    
  function displayData() {
    // first clear the content of the task list so that you don't get a huge long list of duplicate stuff each time
    //the display is updated.
    taskList.innerHTML = "";
  
    // Open our object store and then get a cursor list of all the different data items in the IDB to iterate through
    var objectStore = db.transaction('toDoList').objectStore('toDoList');
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
      
      // grab the values entered into the form fields and store them in an object ready for being inserted into the IDB
      var newItem = [
        { taskTitle: title.value, hours: hours.value, minutes: minutes.value, day: day.value, month: month.value, year: year.value, notified: "no" }
      ];

      // open a read/write db transaction, ready for adding the data
      var transaction = db.transaction(["toDoList"], "readwrite");
    
      // report on the success of opening the transaction
      transaction.oncomplete = function(event) {
        note.innerHTML += '<li>Transaction opened for task addition.</li>';
      };

      transaction.onerror = function(event) {
        note.innerHTML += '<li>Transaction not opened due to error. Duplicate items not allowed.</li>';
      };

      // call an object store that's already been added to the database
      var objectStore = transaction.objectStore("toDoList");
      // add our newItem object to the object store
      var request = objectStore.add(newItem[0]);        
        request.onsuccess = function(event) {
          
          // report the success of our new item going into the database
          note.innerHTML += '<li>New item added to database.</li>';

          //build a date object out of the user-provided time and date information from the form submission
          var myAlarmDate  = new Date(month.value + " " + day.value + ", " + year.value + " " + hours.value + ":" + minutes.value + ":00");

          // The data object can contain any arbitrary data you want to pass to the alarm. Here I'm passing the name of the task
          var data = {
            task: title.value
          }

          // The "ignoreTimezone" string makes the alarm ignore timezones and always go off at the same time wherever you are
          var request = navigator.mozAlarms.add(myAlarmDate, "ignoreTimezone", data);

          request.onsuccess = function () {
            console.log("Alarm sucessfully scheduled");
          };

          request.onerror = function () { 
            console.log("An error occurred: " + this.error.name);
          };

          var listAlarmRequest = navigator.mozAlarms.getAll();

          listAlarmRequest.onsuccess = function () {
            this.result.forEach(function (alarm) {
              console.log('Id: ' + alarm.id);
              console.log('date: ' + alarm.date);
              console.log('respectTimezone: ' + alarm.respectTimezone);
              console.log('data: ' + JSON.stringify(alarm.data));
            });
          };
          
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
    // retrieve the name of the task we want to delete 
    var dataTask = event.target.getAttribute('data-task');
    
    // delete the parent of the button, which is the list item, so it no longer is displayed
    event.target.parentNode.parentNode.removeChild(event.target.parentNode);
    
    // open a database transaction and delete the task, finding it by the name we retrieved above
    var request = db.transaction(["toDoList"], "readwrite").objectStore("toDoList").delete(dataTask);
    
    // report that the data item has been deleted
    request.onsuccess = function(event) {
      note.innerHTML += '<li>Task \"' + dataTask + '\" deleted.</li>';
    };
    
  }
}