import { useState, useRef, useEffect, useCallback } from 'react';
import { Target, MoreVertical, Settings } from 'lucide-react';
import JSZip from 'jszip';

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
  const [showMenu, setShowMenu] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  // Get experiment counter from localStorage
  const getExperimentNumber = (gender) => {
    const counters = JSON.parse(localStorage.getItem('experimentCounters') || '{"M": 0, "F": 0}');
    counters[gender] = (counters[gender] || 0) + 1;
    localStorage.setItem('experimentCounters', JSON.stringify(counters));
    return counters[gender];
  };
  
  const videoRef = useRef(null);
  const secondVideoRef = useRef(null);
  const streamRef = useRef(null);
  const secondStreamRef = useRef(null);
  const configMainVideoRef = useRef(null);
  const configSecondVideoRef = useRef(null);

  const effortLevels = {
    'M': { low: 'Dot 2', high: 'Dot 3' },
    'F': { low: 'Dot 1', high: 'Dot 2' }
  };

  const totalRepetitions = 4;
  const restDuration = 10;

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

  const startCamera = useCallback(async () => {
    try {
      stopCamera();
      const constraints = selectedMainCamera 
        ? { video: { deviceId: { exact: selectedMainCamera } }, audio: false }
        : { video: true, audio: false };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Set stream to main video ref
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('Main camera stream set');
      }
      
      // Also set to config preview if it exists
      if (configMainVideoRef.current) {
        configMainVideoRef.current.srcObject = stream;
        console.log('Config main camera preview set');
      }
    } catch (err) {
      console.error('Error accessing main camera:', err);
    }
  }, [selectedMainCamera]);

  const startSecondCamera = useCallback(async () => {
    try {
      stopSecondCamera();
      if (!selectedSecondCamera) return;
      
      const constraints = {
        video: { deviceId: { exact: selectedSecondCamera } },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      secondStreamRef.current = stream;
      
      // Set stream to main second video ref
      if (secondVideoRef.current) {
        secondVideoRef.current.srcObject = stream;
        console.log('Second camera stream set');
      }
      
      // Also set to config preview if it exists
      if (configSecondVideoRef.current) {
        configSecondVideoRef.current.srcObject = stream;
        console.log('Config second camera preview set');
      }
    } catch (err) {
      console.error('Error accessing second camera:', err);
    }
  }, [selectedSecondCamera]);

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

  const startNeutralCountdown = useCallback((selectedGender) => {
    setExperimentState('neutral-countdown');
    // Give camera a moment to be ready, then capture
    setTimeout(() => {
      captureNeutralPhoto(selectedGender);
    }, 1000);
  }, []);

  const handleKeyPress = useCallback((event) => {
    if (event.key === 'Enter') {
      if (experimentState === 'neutral-ready') {
        startNeutralCountdown();
      }
    }
  }, [experimentState, startNeutralCountdown]);

  const handleGenderSelection = (selectedGender) => {
    console.log('Gender selected:', selectedGender);
    setGender(selectedGender);
    setExperimentState('neutral-instruction');
    
    setTimeout(() => {
      setExperimentState('neutral-ready');
      setTimeout(() => {
        startNeutralCountdown(selectedGender);
      }, 2000);
    }, 3000);
  };

  const captureNeutralPhoto = (selectedGender) => {
    console.log('Attempting to capture neutral photo...');
    
    const success = capturePhoto('neutral');
    setCountdown(null);
    
    if (success !== false) {
      console.log('Neutral photo captured successfully');
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
    
    console.log('Capture attempt for:', label, {
      videoRef: !!videoRef.current,
      videoWidth: videoRef.current?.videoWidth,
      videoHeight: videoRef.current?.videoHeight,
      readyState: videoRef.current?.readyState,
      networkState: videoRef.current?.networkState,
      srcObject: !!videoRef.current?.srcObject,
      streamRef: !!streamRef.current
    });
    
    if (!videoRef.current) {
      console.error('Video element not found - videoRef.current is null');
      console.log('Stream ref status:', !!streamRef.current);
      return false;
    }
    
    if (!streamRef.current) {
      console.error('No stream available - camera may not be started');
      return false;
    }
    
    if (videoRef.current.videoWidth === 0) {
      console.warn('Camera dimensions are 0, but attempting capture anyway');
      // Don't return false - try to capture anyway
    }
    
    console.log('Proceeding with photo capture:', label);
    
    const canvas = document.createElement('canvas');
    // Use video dimensions or fallback to reasonable defaults
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const context = canvas.getContext('2d');
    
    try {
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      console.log('Successfully drew image to canvas');
    } catch (err) {
      console.error('Error drawing image to canvas:', err);
      return false;
    }
    
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

  // useEffects - After all function definitions
  useEffect(() => {
    if (cameras.length > 0 && !selectedMainCamera) {
      setSelectedMainCamera(cameras[0].deviceId);
    }
    if (cameras.length > 1 && !selectedSecondCamera) {
      setSelectedSecondCamera(cameras[1].deviceId);
    }
  }, [cameras, selectedMainCamera, selectedSecondCamera]);

  useEffect(() => {
    if (selectedMainCamera) {
      startCamera();
    }
  }, [selectedMainCamera, startCamera]);

  useEffect(() => {
    if (dualCameraMode && selectedSecondCamera && cameras.length > 1) {
      startSecondCamera();
    } else {
      stopSecondCamera();
    }
  }, [dualCameraMode, selectedSecondCamera, cameras.length, startSecondCamera]);

  useEffect(() => {
    initializeCameras();
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      stopCamera();
      stopSecondCamera();
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  useEffect(() => {
    if (experimentState === 'complete' && capturedImages.length > 0) {
      const createZipAndDownload = async () => {
        try {
          const zip = new JSZip();
          const experimentNumber = getExperimentNumber(gender);
          const experimentName = `${gender}-${experimentNumber}`;
          
          console.log(`Creating experiment zip: ${experimentName}`);
          
          // Add all captured images to the zip
          for (const image of capturedImages) {
            zip.file(image.filename, image.blob);
          }
          
          // Generate the zip file
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          
          // Download the zip file
          const link = document.createElement('a');
          link.href = URL.createObjectURL(zipBlob);
          link.download = `${experimentName}.zip`;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up
          URL.revokeObjectURL(link.href);
          capturedImages.forEach(image => URL.revokeObjectURL(image.url));
          
          console.log(`Experiment ${experimentName} downloaded successfully`);
        } catch (error) {
          console.error('Error creating zip file:', error);
          // Fallback to individual downloads
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
        }
      };
      createZipAndDownload();
    }
  }, [experimentState, capturedImages, gender]);

  const renderConfigScreen = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'black',
      zIndex: 1000,
      padding: '40px',
      overflowY: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '40px'
      }}>
        <h1 style={{
          color: 'white',
          fontSize: '2rem',
          margin: 0
        }}>
          Camera Configuration
        </h1>
        <button
          onClick={() => setShowConfig(false)}
          style={{
            color: 'white',
            backgroundColor: 'transparent',
            border: '2px solid white',
            borderRadius: '5px',
            padding: '10px 20px',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          Close
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '40px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{ color: 'white' }}>
          <h2 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>Main Camera (Face)</h2>
          <select
            value={selectedMainCamera}
            onChange={(e) => setSelectedMainCamera(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '20px',
              fontSize: '1rem',
              backgroundColor: '#333',
              color: 'white',
              border: '1px solid #666',
              borderRadius: '5px'
            }}
          >
            {cameras.map((camera, index) => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {camera.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
          <div style={{
            border: '2px solid white',
            borderRadius: '10px',
            overflow: 'hidden',
            backgroundColor: '#222'
          }}>
            <video
              ref={configMainVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '300px',
                objectFit: 'cover'
              }}
            />
          </div>
        </div>

        <div style={{ color: 'white' }}>
          <h2 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>Second Camera (Field View)</h2>
          <select
            value={selectedSecondCamera}
            onChange={(e) => setSelectedSecondCamera(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '20px',
              fontSize: '1rem',
              backgroundColor: '#333',
              color: 'white',
              border: '1px solid #666',
              borderRadius: '5px'
            }}
          >
            <option value="">Select Camera</option>
            {cameras.map((camera, index) => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {camera.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
          <div style={{
            border: '2px solid white',
            borderRadius: '10px',
            overflow: 'hidden',
            backgroundColor: '#222'
          }}>
            <video
              ref={configSecondVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '300px',
                objectFit: 'cover'
              }}
            />
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#333',
        borderRadius: '10px',
        color: 'white'
      }}>
        <h3 style={{ marginBottom: '10px' }}>Status:</h3>
        <p>Main Camera: {selectedMainCamera ? 'Connected' : 'Not selected'}</p>
        <p>Second Camera: {selectedSecondCamera ? 'Connected' : 'Not selected'}</p>
        <p>Total Cameras Detected: {cameras.length}</p>
      </div>
    </div>
  );

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
        autoPlay
        playsInline
        muted
        ref={(el) => {
          if (el && secondStreamRef.current) {
            el.srcObject = secondStreamRef.current;
          }
        }}
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
      {/* Three dots menu */}
      {experimentState === 'gender-selection' && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 100
        }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '10px'
            }}
          >
            <MoreVertical size={24} />
          </button>
          
          {showMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: '0',
              backgroundColor: '#333',
              border: '1px solid #666',
              borderRadius: '5px',
              minWidth: '150px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
            }}>
              <button
                onClick={() => {
                  setShowConfig(true);
                  setShowMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#444'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <Settings size={16} />
                Configure
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hidden video elements for capture - always present */}
      <video
        ref={videoRef}
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
      
      {showConfig && renderConfigScreen()}
      {!showConfig && experimentState === 'gender-selection' && renderGenderSelection()}
      {!showConfig && experimentState === 'neutral-instruction' && renderNeutralInstruction()}
      {!showConfig && experimentState === 'neutral-ready' && renderNeutralReady()}
      {!showConfig && experimentState === 'neutral-countdown' && renderNeutralReady()}
      {!showConfig && experimentState === 'task' && renderTask()}
      {!showConfig && experimentState === 'rest' && renderRest()}
      {!showConfig && experimentState === 'complete' && renderComplete()}
    </div>
  );
};

export default CameraApp;