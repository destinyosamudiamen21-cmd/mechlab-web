import { Route, Routes } from "react-router";
import Layout from "./components/Layout";
import CoursesPage from "./pages/CoursesPage";
import CoursePage from "./pages/CoursePage";
import TopicPage from "./pages/TopicPage";
import QuestionPage from "./pages/QuestionPage";
import AuthPage from "./pages/AuthPage";
import NotFoundPage from "./pages/NotFoundPage";
import AskPage from "./pages/AskPage";
import CommunityPage from "./pages/CommunityPage";
import ThreadPage from "./pages/ThreadPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CoursesPage />} />
        <Route path='courses/:code' element={<CoursePage />} />
        <Route path='topics/:slug' element={<TopicPage />} />
        <Route path='questions/:slug' element={<QuestionPage />} />
        <Route path='login' element={<AuthPage key='login' mode='login' />} />
        <Route
          path='register'
          element={<AuthPage key='register' mode='register' />}
        />
        <Route path='community' element={<CommunityPage />} />
        <Route path='community/new' element={<AskPage />} />
        <Route path='community/threads/:id' element={<ThreadPage />} />

        <Route path='*' element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
