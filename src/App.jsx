import { BrowserRouter, Routes, Route } from 'react-router-dom'
import StudentsForm from './pages/StudentsForm'  // без .jsx, без подпапки

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StudentsForm />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App