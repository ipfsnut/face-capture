# Face Capture Application

A simple React application that displays a target for eye tracking and captures photos with a countdown timer. The application saves photos automatically when triggered, making it ideal for consistent facial capture scenarios.

## Features

- Large centered target for consistent eye focus
- 3-second countdown timer
- Automatic photo capture
- Timestamp-based file naming
- Minimalist interface without preview distraction
- Keyboard-triggered capture (Enter key)

## Prerequisites

- Node.js (v16 or higher)
- npm (comes with Node.js)
- A webcam or camera connected to your computer
- Modern web browser (Chrome, Firefox, Safari)

## Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd face-capture
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open your browser to the URL shown in the terminal (typically http://localhost:5173)

3. When prompted, allow camera access

## Usage

1. Position yourself in front of the camera
2. Focus on the white target at the top of the screen
3. Press Enter to start the 3-second countdown
4. Hold still until the photo is taken
5. Photos are automatically saved to your Downloads folder with timestamp filenames

## File Naming

Photos are saved with the following format:
`capture-YYYY-MM-DDTHH-mm-ss-MSSZ.jpg`

Example: `capture-2024-02-11T18-30-45-123Z.jpg`

## Building for Production

To create a production build:
```bash
npm run build
```

The built files will be in the `dist` directory.

## License

MIT

## Notes

- The application intentionally hides the camera preview to prevent distraction
- Ensure adequate lighting for best results
- Photos are saved automatically to your Downloads folder
