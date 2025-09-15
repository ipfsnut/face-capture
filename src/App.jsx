import React, { useState, useRef, useEffect } from 'react';
import { Target, MoreVertical, X } from 'lucide-react';

const CameraApp = () => {
  const [countdown, setCountdown] = useState(null);
  const [dualCameraMode, setDualCameraMode] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedMainCamera, setSelectedMainCamera] = useState('');
  const [selectedSecondCamera, setSelectedSecondCamera] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const videoRef = useRef(null);
  const secondVideoRef = useRef(null);
  const streamRef = useRef(null);
  const secondStreamRef = useRef(null);
  const menuRef = useRef(null);
  
  useEffect(() => {
    initializeCameras();
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      stopCamera();
      stopSecondCamera();
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('mousedown', handleClickOutside);
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
    if (event.key === 'Escape' && menuOpen) {
      setMenuOpen(false);
    }
  };

  const handleClickOutside = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setMenuOpen(false);
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
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Capture from main camera
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      const filename = `capture-main-${timestamp}.jpg`;
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      
      URL.revokeObjectURL(link.href);
    }, 'image/jpeg', 0.95);
    
    // Capture from second camera if in dual mode
    if (dualCameraMode && secondVideoRef.current && secondStreamRef.current) {
      const secondCanvas = document.createElement('canvas');
      secondCanvas.width = secondVideoRef.current.videoWidth;
      secondCanvas.height = secondVideoRef.current.videoHeight;
      const secondContext = secondCanvas.getContext('2d');
      secondContext.drawImage(secondVideoRef.current, 0, 0);
      
      secondCanvas.toBlob((blob) => {
        const filename = `capture-field-${timestamp}.jpg`;
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(link.href);
      }, 'image/jpeg', 0.95);
    }
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
      
      {/* Menu button and dropdown */}
      <div ref={menuRef} style={{
        position: 'absolute',
        top: '20px',
        right: '20px'
      }}>
        {/* Menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            padding: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
            ':hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)'
            }
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
        >
          {menuOpen ? <X color="white" size={24} /> : <MoreVertical color="white" size={24} />}
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <div style={{
            position: 'absolute',
            top: '50px',
            right: '0',
            minWidth: '280px',
            backgroundColor: 'rgba(20, 20, 20, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            color: 'white',
            fontSize: '1rem',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{ 
              margin: '0 0 10px 0', 
              fontSize: '1.2rem', 
              fontWeight: '600',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              paddingBottom: '10px'
            }}>
              Camera Settings
            </h3>

            {/* Main camera selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.9rem', color: '#ccc', fontWeight: '500' }}>
                Main Camera (Capture)
              </label>
              <select
                value={selectedMainCamera}
                onChange={(e) => setSelectedMainCamera(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              >
                {cameras.map((camera, index) => (
                  <option key={camera.deviceId} value={camera.deviceId} style={{ backgroundColor: '#1a1a1a' }}>
                    {camera.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Second camera selector */}
            {cameras.length > 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.9rem', color: '#ccc', fontWeight: '500' }}>
                  Field Camera (Display)
                </label>
                <select
                  value={selectedSecondCamera}
                  onChange={(e) => setSelectedSecondCamera(e.target.value)}
                  disabled={!dualCameraMode}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: dualCameraMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    color: dualCameraMode ? 'white' : '#666',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    cursor: dualCameraMode ? 'pointer' : 'not-allowed',
                    fontSize: '0.95rem',
                    outline: 'none',
                    opacity: dualCameraMode ? 1 : 0.5
                  }}
                >
                  {cameras.map((camera, index) => (
                    <option key={camera.deviceId} value={camera.deviceId} style={{ backgroundColor: '#1a1a1a' }}>
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
              gap: '12px',
              padding: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => cameras.length > 1 && (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
            >
              <input
                type="checkbox"
                checked={dualCameraMode}
                onChange={(e) => setDualCameraMode(e.target.checked)}
                disabled={cameras.length < 2}
                style={{
                  width: '20px',
                  height: '20px',
                  cursor: cameras.length < 2 ? 'not-allowed' : 'pointer',
                  accentColor: '#4CAF50'
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>Dual Camera Mode</span>
                <span style={{ fontSize: '0.75rem', color: '#999' }}>
                  {cameras.length < 2 
                    ? 'Requires 2+ cameras' 
                    : 'Captures from both cameras'}
                </span>
              </div>
            </label>
            
            {cameras.length < 2 && (
              <div style={{ 
                fontSize: '0.8rem', 
                color: '#ff9800', 
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 152, 0, 0.3)'
              }}>
                ⚠️ Only one camera detected
              </div>
            )}

            <div style={{
              marginTop: '10px',
              paddingTop: '15px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '0.8rem',
              color: '#666'
            }}>
              Press ESC to close menu
            </div>
          </div>
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