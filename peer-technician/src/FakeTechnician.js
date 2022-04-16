import { useState, useRef, useEffect, useMemo } from "react";

import io from "socket.io-client";
import { Row, Button } from "react-bootstrap";

//mi connetto al server socket
const socket = io.connect("http://3.14.149.99:3000/", {
  transports: ["websocket"],
  query: { id: 2 },
});
//const socket = io.connect("http://localhost:3050/");

function FakeTechnician() {
  const [data, setData] = useState();
  const [showAcceptButton, setShowAcceptButton] = useState(false);
  const [caller, setCaller] = useState();
  const myVideo = useRef();

  let RTCDataChannel;

  const servers = {
    iceServers: [
      {
        urls: [
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
        ],
      },
    ],
  };

  const peerConnection = new RTCPeerConnection(servers);

  useEffect(() => {
    // ** STREAM AUDIO VIDEO ** //
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        myVideo.current.srcObject = stream;
        for (const track of stream.getTracks()) {
          console.log("track ", track);
          peerConnection.addTrack(track, stream);
        }
      });

    // ** ** ** ** ** ** ** ** //

    socket.on("start-call", async () => {
      console.log("start-call");
      setShowAcceptButton(true);
    });

    socket.on("client-offer", async (data) => {
      console.log("client-offer", data);

      if (data.sdp) {
        var offer = {
          sdp: data.sdp.sdp,
          type: data.sdp.type,
        }
        peerConnection.setRemoteDescription(offer);

        let answer = await peerConnection.createAnswer();

        //setto la risposta come local description
        await peerConnection.setLocalDescription(answer);

        //creo json di risposta da inviare all'applicazione mobile
        const obj = {
          from: {
            name: "Bob",
            surname: "Bob",
            email: "",
            phoneNumber: "",
          },
          to: {
            name: "Alice",
            surname: "Alice",
            email: "",
            phoneNumber: "",
          },
          sdp: {
            sdp: answer.sdp,
            type: answer.type,
          }
        };

        socket.emit("technician-offer", obj);
      }
    });

    socket.on("client-ice-candidate", (data) => {
      console.log("client-ice-candidate", data);
    
      const candidate = {
        candidate: data.candidate,
        sdpMid: data.sdpMid,
        sdpMlineIndex: data.sdpMLineIndex,
      }

      if (data.candidate) peerConnection.addIceCandidate(candidate);

      setCaller(data);
    });

    peerConnection.addEventListener("icecandidate", (data) => {
      console.log("technician-event-listener-icecandidate", data);

      if (data.candidate) {
        const obj = {
          from: {
            name: "Bob",
            surname: "Bob",
            email: "",
            phoneNumber: "",
          },
          to: {
            name: "Alice",
            surname: "Alice",
            email: "",
            phoneNumber: "",
          },
          // candidate: data.candidate,
          // candidate: {
            candidate: data.candidate.candidate,
            sdpMid: data.candidate.sdpMid,
            sdpMlineIndex: data.candidate.sdpMLineIndex,
          //},
        };

        //emette evento 'ice-candidate' al server socket ed invia l'oggetto ice
        socket.emit("technician-ice-candidate", obj);
      } else {
        if (!data.candidate) console.log("ice-candidate is null");
        else console.log("caller is null");
      }
    });

    peerConnection.addEventListener("datachannel", (event) => {
      console.log("technician-event-listener-ondatachannel", event);

      RTCDataChannel = event.channel;

      RTCDataChannel.onmessage = (event) => console.log(event.data);
    });

    peerConnection.addEventListener("track", (event) => {
      console.log("steammm:");
      console.log(event);
      //setto stram video su tag <video id='videofrommobile'>
      document.getElementById("video-from-mobile").srcObject = event.streams[0];
    });
  }, []);

  return (
    <>
      <Row className="m-2">Data: {data}</Row>

      {showAcceptButton && (
        <>
          <Button
            onClick={() => {
              socket.emit("accept-call", {
                from: {
                  name: "Bob",
                  surname: "Bob",
                  email: "",
                  phoneNumber: "",
                },
                to: {
                  name: "Alice",
                  surname: "Alice",
                  email: "",
                  phoneNumber: "",
                },
              });
            }}
          >
            Accetta
          </Button>
        </>
      )}
      <video
        playsInline
        ref={myVideo}
        autoPlay
        style={{ width: "300px" }}
        className="border shadow"
        controls
      />

      <video
        id="video-from-mobile"
        playsInline
        autoPlay
        style={{ width: "300px" }}
        className="border shadow"
        controls
      ></video>
    </>
  );
}

export default FakeTechnician;
