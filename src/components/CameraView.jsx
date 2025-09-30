import { useEffect, useRef } from 'react';
import { useCamera } from './CameraProvider';

export const CameraView = ({ 
  camera = 'main', 
  visible = false, 
  style = {},
  className = ''
}) => {
  const { mainStreamRef, secondStreamRef } = useCamera();
  const localVideoRef = useRef(null);
  const streamRef = camera === 'main' ? mainStreamRef : secondStreamRef;
  
  // Sync stream to this local video element
  useEffect(() => {
    if (localVideoRef.current && streamRef.current) {
      localVideoRef.current.srcObject = streamRef.current;
      console.log(`${camera} camera view synced (visible: ${visible})`);
    }
  }, [visible, camera, streamRef]);
  
  const defaultStyle = {
    position: visible ? 'static' : 'fixed',
    top: visible ? 'auto' : '-9999px',
    left: visible ? 'auto' : '-9999px',
    width: visible ? '100%' : '1px',
    height: visible ? '100%' : '1px',
    ...style
  };
  
  return (
    <video
      ref={localVideoRef}
      autoPlay
      playsInline
      muted
      className={className}
      style={defaultStyle}
      onLoadedMetadata={() => {
        console.log(`${camera} camera display loaded`, {
          width: localVideoRef.current?.videoWidth,
          height: localVideoRef.current?.videoHeight
        });
      }}
    />
  );
};