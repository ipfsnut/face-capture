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
      startMainCamera(selectedMainCamera);
      localStorage.setItem('selectedMainCamera', selectedMainCamera);
    }
  }, [selectedMainCamera]);

  useEffect(() => {
    if (selectedSecondCamera) {
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

  const capturePhoto = (videoRef, label) => {
    if (!videoRef || !videoRef.current) {
      console.error(`No video element for ${label}`, {
        ref: !!videoRef,
        current: !!videoRef?.current
      });
      return null;
    }

    const video = videoRef.current;
    
    // Check if video is actually playing
    if (!video.srcObject) {
      console.error(`No stream for ${label}`);
      return null;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    console.log(`Capturing ${label}:`, {
      width: canvas.width,
      height: canvas.height,
      readyState: video.readyState
    });
    
    const context = canvas.getContext('2d');
    try {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      console.log(`Photo captured: ${label}`);
      
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
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
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px'
        }}
      />
      <video
        ref={secondVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px'
        }}
      />
      {children}
    </CameraContext.Provider>
  );
};