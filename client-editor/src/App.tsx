import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Home from './pages/HomePage.tsx'
import EditorPage from './pages/EditorPage.tsx'
import './App.css'

function App() {


  return (
    <>
      <div>
        <Toaster
          position="top-center"
          toastOptions={{
            success: {
              iconTheme: {
                // Changed this from the old green to your new accent color
                primary: '#4DD0E1',
                secondary: '#FFFFFF',
              },
              // You might also want to set the text color to white for contrast
              style: {
                background: '#4DD0E1',
                color: '#FFFFFF',
              }
            },
            // You can also style error toasts, etc.
            error: {
              iconTheme: {
                primary: '#FF5A5F', // A common red for errors
                secondary: '#FFFFFF',
              },
            },
          }}
        ></Toaster>
      </div>

      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />}></Route>
          <Route path="/editor/:roomId" element={<EditorPage />}></Route>
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
