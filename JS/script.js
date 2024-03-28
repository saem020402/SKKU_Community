const firebaseConfig = {
  apiKey: "AIzaSyDMXnXrQQhfpkRzmpVuW_jtLzsc1UVz3qU",
  authDomain: "wpl-final.firebaseapp.com",
  databaseURL: "https://wpl-final-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wpl-final",
  storageBucket: "wpl-final.appspot.com",
  messagingSenderId: "694601702671",
  appId: "1:694601702671:web:0af4006bbadf6e9167727a",
  measurementId: "G-T820VMEPG6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const storage = firebase.storage();

function registerUser() {
  event.preventDefault(); // Prevent form submission

  // Get user input values
  var name = $("input[name='signup_name']").val();
  var email = $("input[name='signup_email']").val();
  var password = $("input[name='signup_password']").val();
  var confirmPassword = $("input[name='signup_confirm']").val();

  // Check if passwords match
  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    return;
  }

  // Register user using Firebase Authentication
  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(function (userCredential) {

      var user = userCredential.user;
      console.log("User registration successful:", user);

      // Add user data to Firestore 'users' collection
      db.collection("users").doc(email).set({
        name: name,
        email: email
      })
        .then(function () {
          window.location.href = "signup_success.html"
        })
        .catch(function (error) {
          console.error("Firestore에 사용자 추가 오류: ", error);
        });

    })
    .catch(function (error) {

      var errorCode = error.code;
      var errorMessage = error.message;
      console.error("사용자 등록 오류:", errorMessage);
      alert(errorMessage);
    });
}

// Event listener for registration form
$("#signform").submit(registerUser);

function loginUser() {
  event.preventDefault(); // Prevent form submission

  // Get user input values
  var id = $("input[name='login_id']").val();
  var password = $("input[name='login_password']").val();

  // Authenticate user using Firebase Authentication
  firebase.auth().signInWithEmailAndPassword(id, password)
    .then(function (userCredential) {

      var user = userCredential.user;
      console.log("로그인 성공:", user);
      window.location.href = "home.html"
    })
    .catch(function (error) {

      var errorMessage = error.message;
      console.error("로그인 오류:", errorMessage);
      alert("Please check your Email or Password.");
    });
}

function gotoProfile() {
  localStorage.setItem("useremail", firebase.auth().currentUser.email);
  window.location.href = "profile.html"
}


// Event listener for login form
$("#loginform").submit(loginUser);

// Additional function for checking duplicate email
function checkDuplicate() {
  event.preventDefault(); // Prevent form submission

  // Get user input value
  var email = $("input[name='signup_email']").val();

  // Check for duplicate email in Firestore 'users' collection
  db.collection("users").doc(email).get()
    .then(function (doc) {
      if (doc.exists) {
        // 동일한 ID가 이미 존재하는 경우
        alert("This email is already used.");
      }
      else {
        alert("OK");
      }
    })
    .catch(function (error) {
      console.error("Error checking duplicate email in Firestore: ", error);
      alert("An error occurred. Please try again later.");
    });
}

// Event listener for duplicate email check button
$("#duplicate").click(checkDuplicate);

function postContent() {
  event.preventDefault();

  // Get form values
  var title = $("#title").val();
  if (title == "") {
    title = "image";
  }
  var field = $("#field").val();
  var image = $("#image")[0].files[0]; // Get the first selected file
  if (image == null) {
    alert("Please select a image");
  }
  var postContent = $("#post_content").val();
  // Get user email (assuming you have authentication set up)
  var userEmail = firebase.auth().currentUser.email;
  // Get current timestamp
  var timestamp = firebase.firestore.FieldValue.serverTimestamp();
  // Reference to storage
  var storageRef = storage.ref();

  var uniqueFilename = title + '-' + image.name;

  // Upload image to storage
  var imageRef = storageRef.child('images/' + uniqueFilename);
  imageRef.put(image).then(function (snapshot) {
    console.log('Uploaded a blob or file!', snapshot);

    // Get the download URL
    imageRef.getDownloadURL().then(function (imageURL) {
      // Create data object
      var postData = {
        title: title,
        field: field,
        image: imageURL,
        postContent: postContent,
        userEmail: userEmail,
        timestamp: timestamp
      };

      // Add post to Firestore
      db.collection("posts").add(postData)
        .then(function (docRef) {
          console.log("Document written with ID: ", docRef.id);
          localStorage.setItem("postID", docRef.id);
          window.location.href = "posted.html";
          // You can redirect or perform other actions after successful submission
        })
        .catch(function (error) {
          console.error("Error adding document: ", error);
        });
    });
  });

}

// Event listener for post form
$("#postform").submit(postContent);

// Function to navigate to the main page
function gotoMain() {
  window.location.href = "home.html";
}

// Function to navigate to the posted page
function gotoPosted(postID) {
  localStorage.setItem("postID", postID);
  window.location.href = "posted.html"

}

// Function to display post details
function DisplayPosts() {
  var postID = localStorage.getItem('postID');
  var postsCollection = db.collection("posts");
  var commentsCollection = db.collection("comments");
  var usersCollection = db.collection("users");

  var post = postsCollection.doc(postID);
  var query = commentsCollection.where("postID", "==", postID);

  // Fade out the comments container with a duration of 500 milliseconds
  $(".comments-container").fadeOut(500, function () {
    $(".comments-container").empty();

    post.get().then((doc) => {
      if (doc.exists) {
        var data = doc.data();
        var userEmail = data.userEmail;
        var title = data.title;
        var imageURL = data.image;
        var postContent = data.postContent;
        var timestamp = data.timestamp;

        if (userEmail == firebase.auth().currentUser.email) {
          $("#postDelete").show();
        }
        // Format timestamp as a string
        var formattedTimestamp = new Date(timestamp.toMillis()).toLocaleString();

        $("#postedtitle").text(title);
        $("#posteduser").text(userEmail);
        $("#postedtime").text("Posted on " + formattedTimestamp);
        $("#postedimg").attr("src", imageURL);
        $("#postedcontents").text(postContent);

        $("#postbody").fadeIn(500);
      } else {
        console.log("해당 문서가 존재하지 않습니다!");
      }
    }).catch((error) => {
      console.log("Error getting document:", error);
    });

    query.get().then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        var data = doc.data();
        var content = data.content;
        var timestamp = data.timestamp;
        var useremail = data.useremail;

        // Get the user's name from Firestore
        var userDoc = usersCollection.doc(useremail);

        userDoc.get().then((userDocSnapshot) => {
          if (userDocSnapshot.exists) {
            var username = userDocSnapshot.data().name;
            var imageURL = userDocSnapshot.data().profileImageURL;
            // Format timestamp as a string
            var formattedTimestamp = new Date(timestamp.toMillis()).toLocaleString();

            var commentElement = $('<div class="media mb-4">');

            // Create and append HTML elements to the comment element
            if (imageURL) {
              commentElement.html(`
              <img class="d-flex mr-3 rounded-circle" src="${imageURL}" alt="" id="commentImg">
              <div class="media-body">
                <h5 class="mt-0" id="commentName">${username}</h5>
                <p id="commentTime" style="font-size: x-small;">${formattedTimestamp}</p>
                <p id="commentContents">${content}</p>
              </div>
              `);
            } else {
              commentElement.html(`
              <img class="d-flex mr-3 rounded-circle" src="./profile.jpg" alt="" id="commentImg">
              <div class="media-body">
                <h5 class="mt-0" id="commentName">${username}</h5>
                <p id="commentTime" style="font-size: x-small;">${formattedTimestamp}</p>
                <p id="commentContents">${content}</p>
              </div>
              `);
            }

            // Append the comment element to the container or body
            $(".comments-container").append(commentElement);
          } else {
            console.log("User document not found for useremail:", useremail);
          }
        }).catch((error) => {
          console.log("Error getting user document:", error);
        });
      });

      // Fade in the comments container with a duration of 500 milliseconds
      $(".comments-container").fadeIn(500);
    }).catch((error) => {
      console.log("Error getting comments:", error);
    });
  });
}

// Function to fetch and display posts
function fetchAndDisplayPosts() {
  // Reference to the "posts" collection
  var postsCollection = db.collection("posts");

  // Reference to the container element with class "col-12"
  var container = $('.col-12');

  // Fade out the container with a duration of 500 milliseconds
  container.fadeOut(500, function () {
    container.empty();

    // Fetch documents from "posts" collection
    postsCollection.orderBy("timestamp", "desc").get().then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        // Access data in each document
        var title = doc.data().title;
        var user = doc.data().userEmail;
        var timestamp = doc.data().timestamp;
        var postID = doc.id;

        // Format timestamp as a string
        var formattedTimestamp = new Date(timestamp.toMillis()).toLocaleString();

        // Create a new post element
        var postElement = $('<div class="post">');

        // Create and append HTML elements to the post element
        postElement.html(`
          <h3><a href="#" onclick="gotoPosted('${postID}')">${title}</a></h3>
          <small>Posted by <span id="posteduseremail">${user}</span> on ${formattedTimestamp}</small>
        `);

        // Append the post element to the container element
        container.append(postElement);
      });

      // Fade in the container with a duration of 500 milliseconds
      container.fadeIn(500);
    }).catch((error) => {
      console.log("Error getting documents: ", error);
    });
  });
}

// Function to display user profile
function DisplayProfile() {
  var email = localStorage.getItem("useremail");
  var usersCollection = db.collection("users");
  var postsCollection = db.collection("posts");

  var container = $("#postslist");

  // Fade out the container with a duration of 500 milliseconds
  container.fadeOut(500, function () {
    container.empty();

    var query = postsCollection.where("userEmail", "==", email);
    var query2 = usersCollection.where("email", "==", email);

    query2.get().then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        var name = doc.data().name;
        var profileImageURL = doc.data().profileImageURL;

        if (email == firebase.auth().currentUser.email) {
          $("#btnChangePicture").fadeIn(500);
        }

        $("#profilename").text(name);
        $("#profileemail").text(email);
        $("#profilename").fadeIn(500);
        $("#profileemail").fadeIn(500);

        // Check if profileImageURL exists
        if (profileImageURL) {
          // Reference to Storage
          $("#imgProfile").attr("src", profileImageURL);
          $("#imgProfile").fadeIn(500);
        }
        else {
          $("#imgProfile").fadeIn(500);
        }
      });
    }).catch((error) => {
      console.log("Error getting documents: ", error);
    });

    query.get().then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        var title = doc.data().title;
        var timestamp = doc.data().timestamp;
        var postID = doc.id;

        var formattedTimestamp = new Date(timestamp.toMillis()).toLocaleString();

        var postElement = $('<div class="col-12">');
        postElement.html(`
            <span id="profilepostlist"><a href="#" onclick="gotoPosted('${postID}')">${title}</a></span>
            <br />
            <small>${formattedTimestamp}</small>
            <hr />
        `);

        container.append(postElement);
      });

      // Fade in the container with a duration of 500 milliseconds
      container.fadeIn(500);
    }).catch((error) => {
      console.log("Error getting documents: ", error);
    });
  });
}

// Function to display posts list based on field value
function DisplayPostslist(fieldValue) {
  // Clear previous posts

  var postsCollection = db.collection("posts");

  // Reference to the container element with class "col-12"
  var container = $('.col-12');
  container.fadeOut(500, function () {
    // After the fadeOut is complete, empty the container
    container.empty();

    // Execute query based on the selected field value
    var query = postsCollection.where("field", "==", fieldValue);

    query.get().then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        var title = doc.data().title;
        var user = doc.data().userEmail;
        var timestamp = doc.data().timestamp;
        var postID = doc.id;

        var formattedTimestamp = new Date(timestamp.toMillis()).toLocaleString();

        var postElement = $('<div class="post">');
        postElement.html(`
            <h3><a href="#" onclick="gotoPosted('${postID}')">${title}</a></h3>
            <small>Posted by <span id="posteduseremail">${user}</span> on ${formattedTimestamp}</small>
        `);

        container.append(postElement);
      });

      // Fade in the container with a duration of 500 milliseconds
      container.fadeIn(500);
    }).catch((error) => {
      console.log("Error getting documents: ", error);
    });
  });
}


// Event listeners for category tabs
$('#all-tab').click(function () {
  fetchAndDisplayPosts();
});

// Event listeners for category tabs
$('#daily-tab').click(function () {
  DisplayPostslist("daily");
});

// Event listeners for category tabs
$('#info-tab').click(function () {
  DisplayPostslist("information");
});

// Event listeners for category tabs
$('#humor-tab').click(function () {
  DisplayPostslist("humor");
});

// Event listeners for category tabs
$('#study-tab').click(function () {
  DisplayPostslist("study");
});

// Event listener for navigating to user profile
$("#posteduser").click(function () {
  localStorage.setItem("useremail", $("#posteduser").text());
  window.location.href = "profile.html"
});

// Function to submit a comment
function submitComment() {
  // Get the comment content, current user's email, post ID, and server timestamp
  var content = $("#commentContent").val();
  var useremail = firebase.auth().currentUser.email; // User's email (Replace with actual user information if using Firebase Authentication)
  var postID = localStorage.getItem('postID');
  var timestamp = firebase.firestore.FieldValue.serverTimestamp();

  // Get the client timestamp
  var clientTimestamp = new Date();

  // Convert client timestamp to a string
  var clientTimestampString = clientTimestamp.toISOString();

  // Query Firestore for the user with the given email
  db.collection("users").where("email", "==", useremail)
    .get()
    .then((querySnapshot) => {
      if (!querySnapshot.empty) {
        // If the document exists (assuming there is only one)
        var userName = querySnapshot.docs[0].data().name;
        console.log("User Name:", userName);

        // Prepare comment data
        var commentdata = {
          content: content,
          user: userName,
          postID: postID,
          timestamp: timestamp,
          useremail: useremail
        };

        // Add comment data to the Firestore 'comments' collection
        db.collection("comments").doc(clientTimestampString).set(commentdata)
          .then(function (docRef) {
            // Refresh the page to update with the new comment
            location.reload();
          })
          .catch(function (error) {
            console.error("Error adding document: ", error);
          });
      } else {
        console.log("No matching documents");
      }
    })
    .catch((error) => {
      console.log("Error getting documents:", error);
    });
}

// Event listener for the comment form submission
$("#commentform").submit(function (event) {
  event.preventDefault(); // Prevent the form from actually submitting
  submitComment();
});

// Document ready function
$(document).ready(function () {
  // Event listener for the 'Change Picture' button
  $('#btnChangePicture').on('click', function () {
    $('#editProfileModal').modal('show');
  });

  // Fetch and display posts on the 'home.html' page
  if (window.location.pathname.includes('home.html')) {
    fetchAndDisplayPosts();
  }

  // Hide post deletion and body on 'posted.html' page, and display post details
  if (window.location.pathname.includes('posted.html')) {
    $("#postDelete").hide();
    $("#postbody").hide();
    DisplayPosts();
  }

  // Hide profile picture, 'Change Picture' button, profile name, and email on 'profile.html' page, and display user profile
  if (window.location.pathname.includes('profile.html')) {
    $("#imgProfile").hide();
    $("#btnChangePicture").hide();
    $("#profilename").hide();
    $("#profileemail").hide();
    DisplayProfile();
  }
});

// Event listener for the post deletion button
$("#postDelete").click(postDelete);

// Function to delete a post
function postDelete() {
  var postID = localStorage.getItem('postID');

  // Reference to the 'posts' collection in Firestore
  var postsCollection = db.collection("posts");

  // Get the reference to the document with the given postID
  var postRef = postsCollection.doc(postID);

  // Delete the document
  postRef.delete().then(() => {
    alert("Post successfully deleted!");
    gotoMain();
  }).catch((error) => {
    console.error("Error deleting post: ", error);
  });
}

// Event listener for the logout button
$("#logoutBtn").click(logout);

// Function to log out the user
function logout() {
  firebase.auth().signOut().then(() => {
    // Code to run upon successful logout
    console.log("User signed out successfully");
    // For example, redirect to the login page or perform other actions
    gotoLogin();
  }).catch((error) => {
    // Code to run if logout fails
    console.error("Error signing out:", error);
  });
}



function saveChanges() {
  // Get the new name from the input field
  var newName = $("#newName").val();

  // Get the selected image file
  var newImageFile = $("#newImage")[0].files[0];

  // Get the current user
  var user = firebase.auth().currentUser;

  // Get the user's email
  var userEmail = user.email;

  // Reference to Firestore collection
  var usersCollection = db.collection("users");

  // Update the user's name in Firestore
  usersCollection.where("email", "==", userEmail).get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      // Update the name field
      doc.ref.update({
        name: newName
      }).then(() => {
        console.log("Name updated successfully");

        // Check if a new image file is selected
        if (newImageFile) {
          // Reference to Storage
          var storageRef = firebase.storage().ref();

          // Path to the user's profile image in Storage
          var imagePath = "profile/" + userEmail;

          // Upload the new image file to Storage
          var uploadTask = storageRef.child(imagePath).put(newImageFile);

          // Listen for state changes, errors, and completion of the upload
          uploadTask.on('state_changed',
            (snapshot) => {
              // Observe state changes such as progress, pause, and resume
              var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log('Upload is ' + progress + '% done');
            },
            (error) => {
              // Handle unsuccessful uploads
              console.error('Error uploading image: ', error);
            },
            () => {
              // Handle successful uploads on complete
              uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                console.log('File available at', downloadURL);

                // Update the user's profile image URL in Firestore
                doc.ref.update({
                  profileImageURL: downloadURL
                }).then(() => {
                  console.log("Profile image URL updated successfully");

                  // Close the modal after updating
                  $('#editProfileModal').modal('hide');
                  location.reload();
                }).catch((error) => {
                  console.error('Error updating profile image URL: ', error);
                });
              });
            }
          );
        } else {
          // Close the modal if no new image file is selected
          $('#editProfileModal').modal('hide');
        }
      }).catch((error) => {
        console.error('Error updating name: ', error);
      });
    });
  }).catch((error) => {
    console.error('Error fetching user document: ', error);
  });
}

function gotoLogin() {
  window.location.href = "login.html";
}

function gotoSignup() {
  window.location.href = "signup.html";
}

function gotoPosting() {
  window.location.href = "posting.html";
}
