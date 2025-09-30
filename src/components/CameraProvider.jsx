import { useState, useRef, useEffect, createContext, useContext } from 'react';

const CameraContext = createContext(null);

export const useCamera = () => {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error('useCamera must be used within CameraProvider');
  }
  return context;
};

export const CameraProvider = ({ children }) => {
  const [cameras, setCameras] = useState([]);
  const [selectedMainCamera, setSelectedMainCamera] = useState('');
  const [selectedSecondCamera, setSelectedSecondCamera] = useState('');
  
  const mainVideoRef = useRef(null);
  const secondVideoRef = useRef(null);
  const mainStreamRef = useRef(null);
  const secondStreamRef = useRef(null);

  // Initialize cameras on mount
  useEffect(() => {
    initializeCameras();
    
    // Load saved camera selections
    const savedMain = localStorage.getItem('selectedMainCamera');
    const savedSecond = localStorage.getItem('selectedSecondCamera');
    if (savedMain) setSelectedMainCamera(savedMain);
    if (savedSecond) setSelectedSecondCamera(savedSecond);
    
    return () => {
      stopAllCameras();
    };
  }, []);

  const initializeCameras = async () => {
    try {
      // Request permission and get device list
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
      tempStream.getTracks().forEach(track => track.stop());
      
      console.log(`Found ${videoDevices.length} cameras`);
    } catch (err) {
      console.error('Error initializing cameras:', err);
    }
  };

  const startMainCamera = async (deviceId) => {
    try {
      if (mainStreamRef.current) {
        mainStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const constraints = deviceId 
        ? { video: { deviceId: { exact: deviceId } }, audio: false }
        : { video: true, audio: false };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mainStreamRef.current = stream;
      
      // IMPORTANT: Set stream to the hidden capture video element
      if (mainVideoRef.current) {
        mainVideoRef.current.srcObject = stream;
        console.log('Main camera started and connected to capture element');
      } else {
        console.error('Main video ref not available!');
      }
      
      return stream;
    } catch (err) {
      console.error('Error starting main camera:', err);
      return null;
    }
  };

  const startSecondCamera = async (deviceId) => {
    try {
      if (secondStreamRef.current) {
        secondStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (!deviceId) {
        console.log('No second camera selected');
        return null;
      }
      
      const constraints = {
        video: { deviceId: { exact: deviceId } },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      secondStreamRef.current = stream;
      
      // IMPORTANT: Set stream to the hidden capture video element
      if (secondVideoRef.current) {
        secondVideoRef.current.srcObject = stream;
        console.log('Second camera started and connected to capture element');
      } else {
        console.error('Second video ref not available!');
      }
      
      return stream;
    } catch (err) {
      console.error('Error starting second camera:', err);
      return null;
    }
  };

  const stopAllCameras = () => {
    if (mainStreamRef.current) {
      mainStreamRef.current.getTracks().forEach(track => track.stop());
      mainStreamRef.current = null;
    }
    if (secondStreamRef.current) {
      secondStreamRef.current.getTracks().forEach(track => track.stop());
      secondStreamRef.current = null;
    }
  };

  // Start cameras when selections change
  useEffect(() => {
    if (selectedMainCamera) {
      console.log('Main camera selection changed, restarting...');
      startMainCamera(selectedMainCamera);
      localStorage.setItem('selectedMainCamera', selectedMainCamera);
    }
  }, [selectedMainCamera]);

  useEffect(() => {
    if (selectedSecondCamera) {
      console.log('Second camera selection changed, restarting...');
      startSecondCamera(selectedSecondCamera);
      localStorage.setItem('selectedSecondCamera', selectedSecondCamera);
    }
  }, [selectedSecondCamera]);

  // Auto-select cameras if available - but don't override saved selections
  useEffect(() => {
    const savedMain = localStorage.getItem('selectedMainCamera');
    const savedSecond = localStorage.getItem('selectedSecondCamera');
    
    // Only auto-select if there's no saved preference
    if (cameras.length > 0 && !selectedMainCamera && !savedMain) {
      // Try to be smart about it - often built-in cameras come first
      setSelectedMainCamera(cameras[0].deviceId);
    }
    if (cameras.length > 1 && !selectedSecondCamera && !savedSecond) {
      // Second camera is often external/USB
      setSelectedSecondCamera(cameras[1].deviceId);
    }
  }, [cameras]);

  const capturePhoto = async (videoRef, label) => {
    if (!videoRef || !videoRef.current) {
      console.error(`No video element for ${label}`, {
        ref: !!videoRef,
        current: !!videoRef?.current
      });
      return null;
    }

    const video = videoRef.current;
    
    // Wait for video to be ready if needed
    if (video.readyState < 2) {
      console.log(`Waiting for video to be ready for ${label}...`);
      await new Promise((resolve) => {
        video.addEventListener('loadeddata', resolve, { once: true });
        setTimeout(resolve, 1000); // Timeout after 1 second
      });
    }
    
    console.log(`Pre-capture check for ${label}:`, {
      hasVideo: !!video,
      hasSrcObject: !!video.srcObject,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState,
      networkState: video.networkState,
      paused: video.paused,
      currentTime: video.currentTime
    });
    
    // Check if video is actually playing
    if (!video.srcObject) {
      console.error(`No stream for ${label}`);
      return null;
    }
    
    // Force play if paused
    if (video.paused) {
      console.log(`Video was paused for ${label}, playing...`);
      video.play();
    }
    
    // Use actual video dimensions if available, fallback to defaults
    const width = video.videoWidth > 0 ? video.videoWidth : 640;
    const height = video.videoHeight > 0 ? video.videoHeight : 480;
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    console.log(`Canvas size for ${label}: ${canvas.width}x${canvas.height}`);
    
    const context = canvas.getContext('2d');
    try {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Check if we actually drew something
      const imageData = context.getImageData(0, 0, 1, 1);
      const isBlank = imageData.data.every(pixel => pixel === 0);
      console.log(`Photo captured: ${label}, isBlank: ${isBlank}`);
      
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          console.log(`Blob created for ${label}, size: ${blob?.size} bytes`);
          resolve(blob);
        }, 'image/jpeg', 0.95);
      });
    } catch (err) {
      console.error(`Error capturing ${label}:`, err);
      return null;
    }
  };

  const value = {
    cameras,
    selectedMainCamera,
    selectedSecondCamera,
    setSelectedMainCamera,
    setSelectedSecondCamera,
    mainVideoRef,
    secondVideoRef,
    mainStreamRef,
    secondStreamRef,
    capturePhoto,
    startMainCamera,
    startSecondCamera,
  };

  return (
    <CameraContext.Provider value={value}>
      {/* Hidden video elements that are always present for capture */}
      <video
        ref={mainVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'fixed',
          top: '-10000px',
          left: '-10000px',
          width: '640px',
          height: '480px',
          objectFit: 'cover'
        }}
        onLoadedMetadata={(e) => {
          console.log('Main capture video loaded:', {
            width: e.target.videoWidth,
            height: e.target.videoHeight
          });
        }}
        onPlay={() => console.log('Main capture video playing')}
        onError={(e) => console.error('Main capture video error:', e)}
      />
      <video
        ref={secondVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'fixed',
          top: '-10000px',
          left: '-10000px',
          width: '640px',
          height: '480px',
          objectFit: 'cover'
        }}
        onLoadedMetadata={(e) => {
          console.log('Second capture video loaded:', {
            width: e.target.videoWidth,
            height: e.target.videoHeight
          });
        }}
        onPlay={() => console.log('Second capture video playing')}
        onError={(e) => console.error('Second capture video error:', e)}
      />
      {children}
    </CameraContext.Provider>
  );
};