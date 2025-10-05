import { useState, useCallback, useEffect } from 'react';
import { Target, MoreVertical, Settings } from 'lucide-react';
import JSZip from 'jszip';
import { CameraProvider, useCamera } from './components/CameraProvider';
import { CameraView } from './components/CameraView';
import { ConfigScreen } from './components/ConfigScreen';

const ExperimentApp = () => {
  const [experimentState, setExperimentState] = useState('gender-selection');
  const [gender, setGender] = useState('');
  const [currentTrial, setCurrentTrial] = useState(0);
  const [targetDot, setTargetDot] = useState('');
  const [captureTimer, setCaptureTimer] = useState(null);
  const [restTimer, setRestTimer] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  const { capturePhoto, mainVideoRef, secondVideoRef } = useCamera();
  
  const effortLevels = {
    'M': { low: 'Dot 2', high: 'Dot 3' },
    'F': { low: 'Dot 1', high: 'Dot 2' }
  };
  
  const totalRepetitions = 5;
  const restDuration = 10;

  const getExperimentNumber = (gender) => {
    const counters = JSON.parse(localStorage.getItem('experimentCounters') || '{"M": 0, "F": 0}');
    counters[gender] = (counters[gender] || 0) + 1;
    localStorage.setItem('experimentCounters', JSON.stringify(counters));
    return counters[gender];
  };

  const handleGenderSelection = (selectedGender) => {
    console.log('Gender selected:', selectedGender);
    setGender(selectedGender);
    setExperimentState('training-instruction');
    
    // Start training phase after instructions
    setTimeout(() => {
      startTrainingPhase();
    }, 4000);
  };

  const startTrainingPhase = () => {
    console.log('Starting training phase');
    const trainingTrials = [
      { effort: 'low', dot: 'Dot 1', type: 'training' },
      { effort: 'high', dot: 'Dot 3', type: 'training' }
    ];
    
    window.trainingTrials = trainingTrials;
    window.currentTrainingIndex = 0;
    runTrainingTrial();
  };
  
  const runTrainingTrial = () => {
    const trial = window.trainingTrials[window.currentTrainingIndex];
    
    if (!trial) {
      // Training complete, show completion screen with options
      setExperimentState('training-complete');
      return;
    }
    
    setTargetDot(trial.dot);
    setExperimentState('training-task');
    
    // No capture for training, just timing
    setCaptureTimer(3);
    const trainingInterval = setInterval(() => {
      setCaptureTimer(prev => {
        if (prev <= 1) {
          clearInterval(trainingInterval);
          setCaptureTimer(null);
          
          // Move to next training trial or complete
          window.currentTrainingIndex++;
          
          if (window.currentTrainingIndex < window.trainingTrials.length) {
            setExperimentState('training-rest');
            setTimeout(() => runTrainingTrial(), 3000);
          } else {
            runTrainingTrial(); // Will trigger completion
          }
          
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const repeatTraining = () => {
    console.log('Repeating training phase');
    startTrainingPhase();
  };
  
  const continueToExperiment = () => {
    console.log('Continuing to main experiment');
    setExperimentState('neutral-instruction');
    setTimeout(() => {
      setExperimentState('neutral-ready');
      setTimeout(() => {
        startNeutralCapture(gender);
      }, 2000);
    }, 3000);
  };

  const startNeutralCapture = (selectedGender) => {
    setExperimentState('neutral-countdown');
    // Give more time for refs to be set
    setTimeout(() => {
      console.log('About to capture neutral, checking refs:', {
        mainRef: !!mainVideoRef?.current,
        secondRef: !!secondVideoRef?.current
      });
      captureNeutralPhoto(selectedGender);
    }, 2000);
  };

  const captureNeutralPhoto = async (selectedGender) => {
    console.log('Capturing neutral photo...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    const mainBlob = await capturePhoto(mainVideoRef, 'neutral');
    if (mainBlob) {
      setCapturedImages(prev => [...prev, {
        filename: `capture-neutral-${timestamp}.jpg`,
        blob: mainBlob,
        url: URL.createObjectURL(mainBlob)
      }]);
    }
    
    const secondBlob = await capturePhoto(secondVideoRef, 'neutral-field');
    if (secondBlob) {
      setCapturedImages(prev => [...prev, {
        filename: `capture-field-neutral-${timestamp}.jpg`,
        blob: secondBlob,
        url: URL.createObjectURL(secondBlob)
      }]);
    }
    
    setExperimentState('rest');
    setTimeout(() => {
      startExperimentalTrials(selectedGender);
    }, 2000);
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
    
    // Randomize trials
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
          captureTrialPhoto(`${trial.effort}-${trial.rep}`);
          setCaptureTimer(null);
          
          setCurrentTrial(prevTrial => {
            const nextTrial = prevTrial + 1;
            if (nextTrial >= totalRepetitions * 2) {
              // Don't set complete here, let runNextTrial handle it
              setTimeout(() => runNextTrial(nextTrial), 100);
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

  const captureTrialPhoto = async (label) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    const mainBlob = await capturePhoto(mainVideoRef, label);
    if (mainBlob) {
      setCapturedImages(prev => [...prev, {
        filename: `capture-${label}-${timestamp}.jpg`,
        blob: mainBlob,
        url: URL.createObjectURL(mainBlob)
      }]);
    }
    
    const secondBlob = await capturePhoto(secondVideoRef, `${label}-field`);
    if (secondBlob) {
      setCapturedImages(prev => [...prev, {
        filename: `capture-field-${label}-${timestamp}.jpg`,
        blob: secondBlob,
        url: URL.createObjectURL(secondBlob)
      }]);
    }
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

  // Track if download has been triggered
  const [downloadTriggered, setDownloadTriggered] = useState(false);

  // Download images as zip when experiment completes
  useEffect(() => {
    console.log('Download check:', {
      state: experimentState,
      imagesCount: capturedImages.length,
      gender: gender,
      downloadTriggered: downloadTriggered
    });
    
    if (experimentState === 'complete' && capturedImages.length > 0 && !downloadTriggered) {
      setDownloadTriggered(true); // Prevent multiple triggers
      
      const createZipAndDownload = async () => {
        try {
          console.log(`Starting zip creation with ${capturedImages.length} images`);
          const zip = new JSZip();
          const experimentNumber = getExperimentNumber(gender);
          const experimentName = `${gender}-${experimentNumber}`;
          
          console.log(`Creating experiment zip: ${experimentName}`);
          console.log('Images to zip:', capturedImages.map(img => img.filename));
          
          for (const image of capturedImages) {
            zip.file(image.filename, image.blob);
          }
          
          console.log('Generating zip blob...');
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          console.log(`Zip blob created, size: ${zipBlob.size} bytes`);
          
          const link = document.createElement('a');
          link.href = URL.createObjectURL(zipBlob);
          link.download = `${experimentName}.zip`;
          link.style.display = 'none';
          document.body.appendChild(link);
          
          console.log('Triggering download...');
          link.click();
          
          // Give browser time to start download before cleanup
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            capturedImages.forEach(image => URL.revokeObjectURL(image.url));
          }, 100);
          
          console.log(`Experiment ${experimentName} download triggered`);
        } catch (error) {
          console.error('Error creating zip file:', error);
        }
      };
      
      // Small delay to ensure state is settled
      setTimeout(createZipAndDownload, 500);
    }
  }, [experimentState, capturedImages, gender, downloadTriggered]);

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


      {/* Configuration screen */}
      {showConfig && <ConfigScreen onClose={() => setShowConfig(false)} />}

      {/* Main experiment screens */}
      {!showConfig && experimentState === 'gender-selection' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '40px'
        }}>
          
          <h1 style={{ color: 'white', fontSize: '3rem', marginBottom: '20px' }}>
            Please select:
          </h1>

          <div>
            <p style={{ color: 'white', fontSize: '2rem'}}>            Welcome to the Physical Effort task. You will use the handgrip dynamometer to exert enough pressure to point the dial at the specified dot. 
            </p>
          </div>
          <div style={{ display: 'flex', gap: '30px', flexDirection: 'column' }}>
            
            <button
              onClick={() => handleGenderSelection('M')}
              style={{
                padding: '20px 60px',
                fontSize: '1.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '2px solid white',
                borderRadius: '10px',
                cursor: 'pointer'
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
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            >
              Female
            </button>
          </div>
        </div>
      )}

      {!showConfig && experimentState === 'training-instruction' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '40px'
        }}>
          <h2 style={{ color: 'white', fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '20px' }}>
            Training Phase
          </h2>
          <p style={{ color: 'white', fontSize: '1.5rem', textAlign: 'center', lineHeight: '1.8', maxWidth: '800px' }}>
            Let's practice first!<br/>
            You'll do 2 practice squeezes:<br/>
            • First to Dot 1 (low effort)<br/>
            • Then to Dot 3 (high effort)<br/><br/>
            The investigator will guide you through this.
          </p>
        </div>
      )}

      {!showConfig && experimentState === 'training-task' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '100vh',
          padding: '50px 0'
        }}>
          <div style={{ 
            color: '#FFD700',
            fontSize: '1.8rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            PRACTICE
          </div>
          
          <div style={{ color: 'white', fontSize: '2.5rem', fontWeight: 'bold' }}>
            Squeeze to {targetDot}
          </div>
          
          <div style={{
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid #FFD700'
          }}>
            <CameraView 
              camera="second" 
              visible={true}
              style={{ 
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>
          
          {captureTimer && (
            <div style={{ color: 'white', fontSize: '1.5rem' }}>
              Hold for {captureTimer}...
            </div>
          )}
          
          <div style={{ color: '#FFD700', fontSize: '1.2rem' }}>
            Practice Trial {(window.currentTrainingIndex || 0) + 1} of 2
          </div>
        </div>
      )}
      
      {!showConfig && experimentState === 'training-rest' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh'
        }}>
          <div style={{ color: '#FFD700', fontSize: '4rem', fontWeight: 'bold' }}>
            REST
          </div>
          <div style={{ color: 'white', fontSize: '1.5rem', marginTop: '20px' }}>
            Get ready for the next practice
          </div>
        </div>
      )}
      
      {!showConfig && experimentState === 'training-complete' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '40px'
        }}>
          <div style={{ color: '#00FF00', fontSize: '3rem', fontWeight: 'bold' }}>
            Training Complete!
          </div>
          
          <p style={{ color: 'white', fontSize: '1.5rem', textAlign: 'center', maxWidth: '800px' }}>
            You've practiced both effort levels. How did that feel?<br/>
            You can practice again if needed, or continue to the actual experiment.
          </p>
          
          <div style={{
            display: 'flex',
            gap: '40px',
            flexDirection: 'column'
          }}>
            <button
              onClick={repeatTraining}
              style={{
                padding: '20px 60px',
                fontSize: '1.5rem',
                backgroundColor: 'rgba(255, 215, 0, 0.2)',
                color: '#FFD700',
                border: '2px solid #FFD700',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'background-color 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 215, 0, 0.3)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 215, 0, 0.2)'}
            >
              Practice Again
            </button>
            
            <button
              onClick={continueToExperiment}
              style={{
                padding: '20px 60px',
                fontSize: '1.5rem',
                backgroundColor: 'rgba(0, 255, 0, 0.2)',
                color: '#00FF00',
                border: '2px solid #00FF00',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'background-color 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0, 255, 0, 0.3)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(0, 255, 0, 0.2)'}
            >
              Continue to Experiment
            </button>
          </div>
          
          <p style={{ color: '#888', fontSize: '1rem', textAlign: 'center' }}>
            The investigator can help you decide which option to choose.
          </p>
        </div>
      )}

      {!showConfig && experimentState === 'neutral-instruction' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh'
        }}>
          <h2 style={{ color: 'white', fontSize: '2rem', textAlign: 'center', lineHeight: '1.5' }}>
            We will now capture your neutral state.<br/>
            Please look at the target on the next screen.
          </h2>
        </div>
      )}

      {!showConfig && (experimentState === 'neutral-ready' || experimentState === 'neutral-countdown') && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '100vh',
          padding: '100px 0'
        }}>
          <Target color="white" size={200} strokeWidth={1.5} />
          <div style={{ color: 'white', fontSize: '1.5rem', textAlign: 'center' }}>
            Look at the target - photo will be taken automatically
          </div>
        </div>
      )}

      {!showConfig && experimentState === 'task' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '100vh',
          padding: '50px 0'
        }}>
          <div style={{ color: 'white', fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '30px' }}>
            Squeeze to {targetDot}
          </div>
          
          <div style={{
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid white'
          }}>
            <CameraView 
              camera="second" 
              visible={true}
              style={{ 
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>
          
          {captureTimer && (
            <div style={{ color: 'white', fontSize: '1.5rem', marginTop: '20px' }}>
              Photo in {captureTimer}...
            </div>
          )}
          
          <div style={{ color: 'white', fontSize: '1.2rem', opacity: 0.7 }}>
            Trial {(window.currentTrialIndex || 0) + 1} of {totalRepetitions * 2}
          </div>
        </div>
      )}

      {!showConfig && experimentState === 'rest' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh'
        }}>
          <div style={{ color: 'white', fontSize: '6rem', fontWeight: 'bold' }}>REST</div>
          {restTimer && (
            <div style={{ color: 'white', fontSize: '2rem', marginTop: '40px', opacity: 0.7 }}>
              {restTimer}s
            </div>
          )}
        </div>
      )}

      {!showConfig && experimentState === 'complete' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh'
        }}>
          <div style={{ color: 'white', fontSize: '6rem', fontWeight: 'bold' }}>COMPLETE</div>
        </div>
      )}
    </div>
  );
};

const CameraApp = () => (
  <CameraProvider>
    <ExperimentApp />
  </CameraProvider>
);

export default CameraApp;