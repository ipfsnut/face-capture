import React, { useState, useRef, useEffect } from 'react';
import { Target } from 'lucide-react';

const CameraApp = () => {
  const [countdown, setCountdown] = useState(null);
  const [dualCameraMode, setDualCameraMode] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedMainCamera, setSelectedMainCamera] = useState('');
  const [selectedSecondCamera, setSelectedSecondCamera] = useState('');
  const videoRef = useRef(null);
  const secondVideoRef = useRef(null);
  const streamRef = useRef(null);
  const secondStreamRef = useRef(null);
  
  useEffect(() => {
    initializeCameras();
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      stopCamera();
      stopSecondCamera();
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  useEffect(() => {
    if (cameras.length > 0 && !selectedMainCamera) {
      setSelectedMainCamera(cameras[0].deviceId);
    }
    if (cameras.length > 1 && !selectedSecondCamera) {
      setSelectedSecondCamera(cameras[1].deviceId);
    }
  }, [cameras]);

  useEffect(() => {
    if (selectedMainCamera) {
      startCamera();
    }
  }, [selectedMainCamera]);

  useEffect(() => {
    if (dualCameraMode && selectedSecondCamera && cameras.length > 1) {
      startSecondCamera();
    } else {
      stopSecondCamera();
    }
  }, [dualCameraMode, selectedSecondCamera]);

  const initializeCameras = async () => {
    try {
      // Request camera permissions once with a temporary stream
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      
      // Now enumerate devices (will have labels after permission granted)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
      
      // Clean up the temporary stream
      tempStream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error('Error initializing cameras:', err);
    }
  };

  const startCamera = async () => {
    try {
      stopCamera(); // Stop any existing stream first
      
      const constraints = selectedMainCamera 
        ? { video: { deviceId: { exact: selectedMainCamera } }, audio: false }
        : { video: true, audio: false };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing main camera:', err);
    }
  };

  const startSecondCamera = async () => {
    try {
      stopSecondCamera(); // Stop any existing stream first
      
      if (!selectedSecondCamera) {
        console.warn('No second camera selected');
        return;
      }
      
      const constraints = {
        video: { deviceId: { exact: selectedSecondCamera } },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      secondStreamRef.current = stream;
      if (secondVideoRef.current) {
        secondVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing second camera:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const stopSecondCamera = () => {
    if (secondStreamRef.current) {
      secondStreamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !countdown) {
      startCountdown();
    }
  };

  const startCountdown = () => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          capturePhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const capturePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `capture-${timestamp}.jpg`;
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      
      URL.revokeObjectURL(link.href);
    }, 'image/jpeg', 0.95);
  };

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'black',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '2rem'
    }}>
      {/* Hidden video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px'
        }}
      />
      
      {/* Camera controls */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        color: 'white',
        fontSize: '1rem',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '15px',
        borderRadius: '8px'
      }}>
        {/* Main camera selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '0.875rem', color: '#ccc' }}>Main Camera (Capture)</label>
          <select
            value={selectedMainCamera}
            onChange={(e) => setSelectedMainCamera(e.target.value)}
            style={{
              padding: '5px',
              borderRadius: '4px',
              backgroundColor: '#333',
              color: 'white',
              border: '1px solid #555',
              cursor: 'pointer'
            }}
          >
            {cameras.map((camera, index) => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {camera.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
        </div>

        {/* Second camera selector */}
        {cameras.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.875rem', color: '#ccc' }}>Second Camera (Display)</label>
            <select
              value={selectedSecondCamera}
              onChange={(e) => setSelectedSecondCamera(e.target.value)}
              disabled={!dualCameraMode}
              style={{
                padding: '5px',
                borderRadius: '4px',
                backgroundColor: dualCameraMode ? '#333' : '#222',
                color: dualCameraMode ? 'white' : '#666',
                border: '1px solid #555',
                cursor: dualCameraMode ? 'pointer' : 'not-allowed'
              }}
            >
              {cameras.map((camera, index) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Dual camera mode toggle */}
        <label style={{ 
          cursor: cameras.length > 1 ? 'pointer' : 'not-allowed', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          marginTop: '10px'
        }}>
          <input
            type="checkbox"
            checked={dualCameraMode}
            onChange={(e) => setDualCameraMode(e.target.checked)}
            disabled={cameras.length < 2}
            style={{
              width: '20px',
              height: '20px',
              cursor: cameras.length < 2 ? 'not-allowed' : 'pointer'
            }}
          />
          <span>Dual Camera Mode</span>
        </label>
        
        {cameras.length < 2 && (
          <span style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic' }}>
            Only one camera detected
          </span>
        )}
      </div>

      {/* Large centered target or second camera feed */}
      <div style={{
        marginTop: '100px',
        display: 'flex',
        justifyContent: 'center',
        width: '100%'
      }}>
        {dualCameraMode ? (
          <video
            ref={secondVideoRef}
            autoPlay
            playsInline
            style={{
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid white'
            }}
          />
        ) : (
          <Target 
            color="white" 
            size={200}  // Much larger target
            strokeWidth={1.5}
          />
        )}
      </div>

      {/* Countdown overlay */}
      {countdown && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '6rem',
          fontWeight: 'bold',
          color: 'white'
        }}>
          {countdown}
        </div>
      )}
      
      {/* Instructions at bottom */}
      <div style={{
        color: 'white',
        fontSize: '1.5rem',
        marginBottom: '100px',
        textAlign: 'center'
      }}>
        Press Enter to begin countdown
      </div>
    </div>
  );
};

export default CameraApp