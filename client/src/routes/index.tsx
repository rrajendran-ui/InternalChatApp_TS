import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import RegisterPage from "../pages/RegisterPage";
import CheckEmailPage from "../pages/CheckEmailPage";
import CheckPasswordPage from "../pages/CheckPasswordPage";
import Home from "../pages/Home";
import MessagePage from "../components/MessagePage";
import AuthLayouts from "../layout";
import Forgotpassword from "../pages/Forgotpassword";
import ChangePassword from "../pages/ChangePassword";

const router = createBrowserRouter([
{
    path : "/",
    element : <App/>,
    children : [
         {
        index: true, // default page
        element: <CheckEmailPage />,
        },
        {
            path : "register",
            element : <AuthLayouts><RegisterPage/></AuthLayouts>
        },
        // {
        //     path : 'email',
        //     element : <AuthLayouts><CheckEmailPage/></AuthLayouts>
        // },
        {
            path : 'password',
            element : <AuthLayouts><CheckPasswordPage/></AuthLayouts>
        },
        {
            path : 'changepassword',
            element : <AuthLayouts><ChangePassword/></AuthLayouts>
        },
        {
            path : 'forgot-password',
            element : <AuthLayouts><Forgotpassword/></AuthLayouts>
        },
        {
            path : "/home",
            element : <Home/>,
            children : [
                {
                    path: "topic/:topicId",
                    element: <MessagePage />,
                }
            ]
        }
    ]
}
])

export default router