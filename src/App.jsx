import React, { useState, useRef, useEffect } from 'react';
import { Target } from 'lucide-react';

const CameraApp = () => {
  const [countdown, setCountdown] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  
  useEffect(() => {
    startCamera();
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      stopCamera();
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
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
      
      {/* Large centered target */}
      <div style={{
        marginTop: '100px',
        display: 'flex',
        justifyContent: 'center',
        width: '100%'
      }}>
        <Target 
          color="white" 
          size={200}  // Much larger target
          strokeWidth={1.5}
        />
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