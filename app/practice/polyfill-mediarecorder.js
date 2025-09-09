// MediaRecorder polyfill for older browsers
if (typeof window !== 'undefined') {
  if (!window.MediaRecorder) {
    // Simple polyfill - in production you'd want to use a proper polyfill
    window.MediaRecorder = class {
      constructor(stream) {
        this.stream = stream;
        this.state = 'inactive';
        this.ondataavailable = null;
        this.onstop = null;
      }
      
      start() {
        this.state = 'recording';
        // Simulate recording
        setTimeout(() => {
          if (this.ondataavailable) {
            this.ondataavailable({ data: new Blob() });
          }
        }, 1000);
      }
      
      stop() {
        this.state = 'inactive';
        if (this.onstop) {
          this.onstop();
        }
      }
    };
  }
}

export default function PolyfillMediaRecorder() {
  return null;
}
