import { BrowserRouter, Routes, Route } from 'react-router-dom'
import StudentsForm from './pages/StudentsForm'  

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/form" element={<StudentsForm />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App