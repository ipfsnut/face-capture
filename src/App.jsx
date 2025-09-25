import React, { useState, useRef, useEffect } from 'react';
import { Target } from 'lucide-react';

const CameraApp = () => {
  const [experimentState, setExperimentState] = useState('gender-selection');
  const [gender, setGender] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [currentTrial, setCurrentTrial] = useState(0);
  const [targetDot, setTargetDot] = useState('');
  const [captureTimer, setCaptureTimer] = useState(null);
  const [restTimer, setRestTimer] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  
  const [dualCameraMode] = useState(true);
  const [cameras, setCameras] = useState([]);
  const [selectedMainCamera, setSelectedMainCamera] = useState('');
  const [selectedSecondCamera, setSelectedSecondCamera] = useState('');
  
  const videoRef = useRef(null);
  const secondVideoRef = useRef(null);
  const streamRef = useRef(null);
  const secondStreamRef = useRef(null);

  const effortLevels = {
    'M': { low: 'Blue', high: 'Red' },
    'F': { low: 'Black', high: 'Green' }
  };

  const totalRepetitions = 4;
  const restDuration = 10;

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
  }, [dualCameraMode, selectedSecondCamera, cameras.length]);

  const initializeCameras = async () => {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
      tempStream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error('Error initializing cameras:', err);
    }
  };

  const startCamera = async () => {
    try {
      stopCamera();
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
      stopSecondCamera();
      if (!selectedSecondCamera) return;
      
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
    if (event.key === 'Enter') {
      if (experimentState === 'neutral-ready') {
        startNeutralCountdown();
      }
    }
  };

  const handleGenderSelection = (selectedGender) => {
    const finalGender = selectedGender === 'prefer-not' ? 'F' : selectedGender;
    console.log('Gender selected:', selectedGender, '-> Final gender:', finalGender);
    setGender(finalGender);
    setExperimentState('neutral-instruction');
    
    setTimeout(() => {
      setExperimentState('neutral-ready');
      setTimeout(() => {
        startNeutralCountdown(finalGender);
      }, 2000);
    }, 3000);
  };

  const startNeutralCountdown = (selectedGender) => {
    setExperimentState('neutral-countdown');
    captureNeutralPhoto(selectedGender);
  };

  const captureNeutralPhoto = (selectedGender) => {
    console.log('Attempting to capture neutral photo...');
    const success = capturePhoto('neutral');
    setCountdown(null);
    
    if (success !== false) {
      setExperimentState('rest');
      setTimeout(() => {
        startExperimentalTrials(selectedGender);
      }, 2000);
    } else {
      console.error('Failed to capture neutral photo, retrying in 1 second...');
      setTimeout(() => captureNeutralPhoto(selectedGender), 1000);
    }
  };

  const startExperimentalTrials = (selectedGender) => {
    console.log('Starting experimental trials with gender:', selectedGender);
    const effortSet = effortLevels[selectedGender];
    
    if (!effortSet) {
      console.error('No effort set found for gender:', selectedGender);
      return;
    }
    
    const trials = [];
    
    for (let i = 0; i < totalRepetitions; i++) {
      trials.push({ effort: 'low', dot: effortSet.low, rep: i + 1 });
      trials.push({ effort: 'high', dot: effortSet.high, rep: i + 1 });
    }
    
    for (let i = trials.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [trials[i], trials[j]] = [trials[j], trials[i]];
    }
    
    window.experimentTrials = trials;
    setCurrentTrial(0);
    runNextTrial();
  };

  const runNextTrial = (trialIndex = currentTrial) => {
    if (trialIndex >= totalRepetitions * 2) {
      setExperimentState('complete');
      return;
    }
    
    const trial = window.experimentTrials[trialIndex];
    setTargetDot(trial.dot);
    setExperimentState('task');
    
    window.currentTrialIndex = trialIndex;
    
    setCaptureTimer(3);
    const captureTimerInterval = setInterval(() => {
      setCaptureTimer(prev => {
        if (prev <= 1) {
          clearInterval(captureTimerInterval);
          capturePhoto(`${trial.effort}-${trial.rep}`);
          setCaptureTimer(null);
          
          setCurrentTrial(prevTrial => {
            const nextTrial = prevTrial + 1;
            if (nextTrial >= totalRepetitions * 2) {
              setExperimentState('complete');
            } else {
              startRestPeriod(nextTrial);
            }
            return nextTrial;
          });
          
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRestPeriod = (nextTrial) => {
    setExperimentState('rest');
    setRestTimer(restDuration);
    
    const restInterval = setInterval(() => {
      setRestTimer(prev => {
        if (prev <= 1) {
          clearInterval(restInterval);
          setRestTimer(null);
          setTimeout(() => runNextTrial(nextTrial), 100);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const capturePhoto = (label) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (!videoRef.current || videoRef.current.videoWidth === 0) {
      console.error('Main camera not ready for capture', {
        videoRef: !!videoRef.current,
        videoWidth: videoRef.current?.videoWidth,
        readyState: videoRef.current?.readyState
      });
      return false;
    }
    
    console.log('Capturing photo:', label);
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      const filename = `capture-${label}-${timestamp}.jpg`;
      const imageUrl = URL.createObjectURL(blob);
      setCapturedImages(prev => [...prev, { filename, blob, url: imageUrl }]);
    }, 'image/jpeg', 0.95);
    
    if (dualCameraMode && secondVideoRef.current && secondStreamRef.current) {
      const secondCanvas = document.createElement('canvas');
      secondCanvas.width = secondVideoRef.current.videoWidth;
      secondCanvas.height = secondVideoRef.current.videoHeight;
      
      if (secondCanvas.width > 0 && secondCanvas.height > 0) {
        const secondContext = secondCanvas.getContext('2d');
        secondContext.drawImage(secondVideoRef.current, 0, 0);
        
        secondCanvas.toBlob((blob) => {
          if (blob) {
            const filename = `capture-field-${label}-${timestamp}.jpg`;
            const imageUrl = URL.createObjectURL(blob);
            setCapturedImages(prev => [...prev, { filename, blob, url: imageUrl }]);
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  useEffect(() => {
    if (experimentState === 'complete' && capturedImages.length > 0) {
      const downloadAll = async () => {
        for (const image of capturedImages) {
          const link = document.createElement('a');
          link.href = image.url;
          link.download = image.filename;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        capturedImages.forEach(image => URL.revokeObjectURL(image.url));
      };
      downloadAll();
    }
  }, [experimentState, capturedImages]);

  const renderGenderSelection = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '40px'
    }}>
      <h1 style={{
        color: 'white',
        fontSize: '3rem',
        marginBottom: '20px'
      }}>
        Please select:
      </h1>
      <div style={{
        display: 'flex',
        gap: '30px',
        flexDirection: 'column'
      }}>
        <button
          onClick={() => handleGenderSelection('M')}
          style={{
            padding: '20px 60px',
            fontSize: '1.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '2px solid white',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'background-color 0.3s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
        >
          Male
        </button>
        <button
          onClick={() => handleGenderSelection('F')}
          style={{
            padding: '20px 60px',
            fontSize: '1.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '2px solid white',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'background-color 0.3s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
        >
          Female
        </button>
        <button
          onClick={() => handleGenderSelection('prefer-not')}
          style={{
            padding: '20px 60px',
            fontSize: '1.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '2px solid white',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'background-color 0.3s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
        >
          Prefer not to say
        </button>
      </div>
    </div>
  );

  const renderNeutralInstruction = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh'
    }}>
      <h2 style={{
        color: 'white',
        fontSize: '2rem',
        textAlign: 'center',
        lineHeight: '1.5'
      }}>
        We will now capture your neutral state.<br/>
        Please look at the target on the next screen.
      </h2>
    </div>
  );

  const renderNeutralReady = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '100vh',
      padding: '100px 0'
    }}>
      <Target 
        color="white" 
        size={200}
        strokeWidth={1.5}
      />
      <div style={{
        color: 'white',
        fontSize: '1.5rem',
        textAlign: 'center'
      }}>
        Look at the target - photo will be taken automatically
      </div>
    </div>
  );

  const renderTask = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '100vh',
      padding: '50px 0'
    }}>
      <div style={{
        color: 'white',
        fontSize: '2.5rem',
        fontWeight: 'bold',
        marginBottom: '30px'
      }}>
        Squeeze to {targetDot} dot
      </div>
      
      <video
        ref={secondVideoRef}
        autoPlay
        playsInline
        style={{
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          objectFit: 'cover',
          border: '3px solid white'
        }}
      />
      
      {captureTimer && (
        <div style={{
          color: 'white',
          fontSize: '1.5rem',
          marginTop: '20px'
        }}>
          Photo in {captureTimer}...
        </div>
      )}
      
      <div style={{
        color: 'white',
        fontSize: '1.2rem',
        opacity: 0.7
      }}>
        Trial {(window.currentTrialIndex || 0) + 1} of {totalRepetitions * 2}
      </div>
    </div>
  );

  const renderRest = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh'
    }}>
      <div style={{
        color: 'white',
        fontSize: '6rem',
        fontWeight: 'bold'
      }}>
        REST
      </div>
      {restTimer && (
        <div style={{
          color: 'white',
          fontSize: '2rem',
          marginTop: '40px',
          opacity: 0.7
        }}>
          {restTimer}s
        </div>
      )}
    </div>
  );

  const renderComplete = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh'
    }}>
      <div style={{
        color: 'white',
        fontSize: '6rem',
        fontWeight: 'bold'
      }}>
        COMPLETE
      </div>
    </div>
  );

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'black'
    }}>
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
      
      {countdown && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '8rem',
          fontWeight: 'bold',
          color: 'white',
          zIndex: 1000
        }}>
          {countdown}
        </div>
      )}
      
      {experimentState === 'gender-selection' && renderGenderSelection()}
      {experimentState === 'neutral-instruction' && renderNeutralInstruction()}
      {experimentState === 'neutral-ready' && renderNeutralReady()}
      {experimentState === 'neutral-countdown' && renderNeutralReady()}
      {experimentState === 'task' && renderTask()}
      {experimentState === 'rest' && renderRest()}
      {experimentState === 'complete' && renderComplete()}
    </div>
  );
};

export default CameraApp;