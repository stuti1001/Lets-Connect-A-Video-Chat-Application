const socket = io('/')
const videoGrid = document.getElementById('video-grid');
const myPeer = new Peer() //Creating a peer element which represents the current user
var mypeer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: "443",
});
const myVideo = document.createElement('video')
const showChat = document.querySelector('#showChat');
const backBtn = document.querySelector('.header__back');
myVideo.muted = true
const peers = {}
const whiteboardButt = document.querySelector('.board-icon')
const user = prompt("Enter your name");

//whiteboard js start
const whiteboardCont = document.querySelector('.whiteboard-cont');
const canvas = document.querySelector("#whiteboard");
const ctx = canvas.getContext('2d');

let boardVisisble = false;

whiteboardCont.style.visibility = 'hidden';

let isDrawing = 0;
let x = 0;
let y = 0;
let color = "black";
let drawsize = 3;
let colorRemote = "black";
let drawsizeRemote = 3;

function fitToContainer(canvas) {
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

fitToContainer(canvas);

//getCanvas call is under join room call
socket.on('getCanvas', url => {
    let img = new Image();
    img.onload = start;
    img.src = url;

    function start() {
        ctx.drawImage(img, 0, 0);
    }

    console.log('got canvas', url)
})

function setColor(newcolor) {
    color = newcolor;
    drawsize = 3;
}

function setEraser() {
    color = "white";
    drawsize = 10;
}

//might remove this
function reportWindowSize() {
    fitToContainer(canvas);
}

window.onresize = reportWindowSize;
//

function clearBoard() {
    if (window.confirm('Are you sure you want to clear board? This cannot be undone')) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        socket.emit('store canvas', canvas.toDataURL());
        socket.emit('clearBoard');
    }
    else return;
}

socket.on('clearBoard', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
})

function draw(newx, newy, oldx, oldy) {
    ctx.strokeStyle = color;
    ctx.lineWidth = drawsize;
    ctx.beginPath();
    ctx.moveTo(oldx, oldy);
    ctx.lineTo(newx, newy);
    ctx.stroke();
    ctx.closePath();

    socket.emit('store canvas', canvas.toDataURL());

}

function drawRemote(newx, newy, oldx, oldy) {
    ctx.strokeStyle = colorRemote;
    ctx.lineWidth = drawsizeRemote;
    ctx.beginPath();
    ctx.moveTo(oldx, oldy);
    ctx.lineTo(newx, newy);
    ctx.stroke();
    ctx.closePath();

}

canvas.addEventListener('mousedown', e => {
    x = e.offsetX;
    y = e.offsetY;
    isDrawing = 1;
})

canvas.addEventListener('mousemove', e => {
    if (isDrawing) {
        draw(e.offsetX, e.offsetY, x, y);
        socket.emit('draw', e.offsetX, e.offsetY, x, y, color, drawsize);
        x = e.offsetX;
        y = e.offsetY;
    }
})

window.addEventListener('mouseup', e => {
    if (isDrawing) {
        isDrawing = 0;
    }
})

socket.on('draw', (newX, newY, prevX, prevY, color, size) => {
    colorRemote = color;
    drawsizeRemote = size;
    drawRemote(newX, newY, prevX, prevY);
})

//whiteboard js end

backBtn.addEventListener('click', () => {
  document.querySelector('.main__left').style.display = 'flex';
  document.querySelector('.main__left').style.flex = '1';
  document.querySelector('.main__right').style.display = 'none';
  document.querySelector('.header__back').style.display = 'none';
});

showChat.addEventListener("click", () => {
  document.querySelector(".main__right").style.display = "flex";
  document.querySelector(".main__right").style.flex = "0.4";
  document.querySelector(".main__left").style.display = "flex";
  document.querySelector(".header__back").style.display = "block";
});

whiteboardButt.addEventListener('click', () => {
  if (boardVisisble) {
      whiteboardCont.style.visibility = 'hidden';
      boardVisisble = false;
      document.querySelector('#video-grid').style.display = 'flex';
  }
  else {
      whiteboardCont.style.visibility = 'visible';
      boardVisisble = true;
      document.querySelector('#video-grid').style.display = 'none';
  }
})


// Access the user's video and audio
let myVideoStream; 
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
  myVideoStream = stream;
    addVideoStream(myVideo, stream); // Display our video to ourselves
    const JoinCall = document.querySelector("#JoinCall");
    let button = document.querySelector(".button");
    button.disabled = true;
    let EndCallButt = document.querySelector("#EndCall");
    let endbutton = document.querySelector(".endbutton");
    endbutton.disabled = true;
    myPeer.on('call', call => { // When we join someone's room we will receive a call from them
     button.disabled = false;
      JoinCall.addEventListener("click", () => { 
      call.answer(stream) // Stream them our video/audio
        const video = document.createElement('video') // Create a video tag for them
        call.on('stream', userVideoStream => { // When we recieve their stream
            addVideoStream(video, userVideoStream) // Display their video to ourselves
        })
        button.disabled = true;
        endbutton.disabled = false; 
        EndCallButt.addEventListener("click", (e) => {
        video.remove();
        socket.emit('endvidcall');
        endbutton.disabled = true;
      }) 
    })
    })

    socket.on('user-connected', (userId) => { // If a new user connect
        connectToNewUser(userId, stream) 
    })
})

socket.on('user-disconnected', (userId) => {
  if (peers[userId]) peers[userId].close()
})

socket.on('End_Call', (userId) => {
  if (peers[userId]) peers[userId].close()
})

myPeer.on('open', (id) => { // When we first open the app, have us join a room
    socket.emit('join-room', ROOM_ID, id, user)
})

function connectToNewUser(userId, stream) { // This runs when someone joins our room
  const call = myPeer.call(userId, stream) // Call the user who just joined
    // Add their video
    const video = document.createElement('video') 
    call.on('stream', (userVideoStream) => {
        addVideoStream(video, userVideoStream)
    })
    // If they leave, remove their video
    call.on('close', () => {
        video.remove()
    })
    peers[userId] = call
}


function addVideoStream(video, stream) {
    video.srcObject = stream 
    video.addEventListener('loadedmetadata', () => { // Play the video as it loads
        video.play()
    })
    videoGrid.append(video) // Append video element to videoGrid
}


let text = document.querySelector("#chat_message");
let send = document.getElementById("send");
let messages = document.querySelector(".messages");

send.addEventListener("click", (e) => {
  if (text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
});

text.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
});
const raisehand = document.querySelector("#raisehand");
const inviteButton = document.querySelector("#inviteButton");
const muteButton = document.querySelector("#muteButton");
const stopVideo = document.querySelector("#stopVideo");
muteButton.addEventListener("click", () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    html = `<i class="fas fa-microphone-slash"></i>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    html = `<i class="fas fa-microphone"></i>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  }
});

stopVideo.addEventListener("click", () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    html = `<i class="fas fa-video-slash"></i>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    html = `<i class="fas fa-video"></i>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  }
});

inviteButton.addEventListener("click", (e) => {
  prompt(
    "Copy this link and send it to people you want to meet with",
    window.location.href
  );
  });
 raisehand.addEventListener("click", (e) => {
   text.value = `<i class="fas fa-fist-raised"></i>`
   socket.emit("message", text.value);
   text.value = ""
 })



const main__chat_window = document.querySelector('.main__chat_window')
socket.on("createMessage", (message, userName) => {
  messages.innerHTML =
    messages.innerHTML +
    `<div class="message">
        <b><i class="far fa-user-circle"></i> <span> ${
          userName === user ? "me" : userName
        }</span> </b>
        <span>${message}</span>
    </div>`;
    main__chat_window.scrollTop = main__chat_window.scrollHeight;
});
const End = document.querySelector("#End");
End.addEventListener('click', () => {
  location.href = 'views\index.html';
})