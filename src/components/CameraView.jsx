import { useEffect } from 'react';
import { useCamera } from './CameraProvider';

export const CameraView = ({ 
  camera = 'main', 
  visible = false, 
  style = {},
  className = ''
}) => {
  const { mainVideoRef, secondVideoRef, mainStreamRef, secondStreamRef } = useCamera();
  
  const videoRef = camera === 'main' ? mainVideoRef : secondVideoRef;
  const streamRef = camera === 'main' ? mainStreamRef : secondStreamRef;
  
  // Sync stream when component mounts or visibility changes
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      console.log(`${camera} camera view synced (visible: ${visible})`);
    }
  }, [visible, camera, videoRef, streamRef]);
  
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
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={className}
      style={defaultStyle}
      onLoadedMetadata={() => {
        console.log(`${camera} camera metadata loaded`, {
          width: videoRef.current?.videoWidth,
          height: videoRef.current?.videoHeight
        });
      }}
    />
  );
};