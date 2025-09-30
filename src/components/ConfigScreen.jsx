import { useCamera } from './CameraProvider';
import { CameraView } from './CameraView';

export const ConfigScreen = ({ onClose }) => {
  const { 
    cameras, 
    selectedMainCamera, 
    selectedSecondCamera,
    setSelectedMainCamera,
    setSelectedSecondCamera 
  } = useCamera();
  
  const getCounters = () => {
    return JSON.parse(localStorage.getItem('experimentCounters') || '{"M": 0, "F": 0}');
  };
  
  const counters = getCounters();
  
  return (
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
          onClick={onClose}
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
            backgroundColor: '#222',
            height: '300px'
          }}>
            <CameraView 
              camera="main" 
              visible={true}
              style={{ objectFit: 'cover' }}
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
            backgroundColor: '#222',
            height: '300px'
          }}>
            <CameraView 
              camera="second" 
              visible={true}
              style={{ objectFit: 'cover' }}
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
        
        <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Experiment Counters:</h3>
        <p>Next Male Experiment: M-{counters.M + 1}</p>
        <p>Next Female Experiment: F-{counters.F + 1}</p>
      </div>
    </div>
  );
};