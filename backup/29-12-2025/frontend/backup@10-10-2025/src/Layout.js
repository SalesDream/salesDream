import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";

export default function Layout({ children }){
  return (
  <div className="min-h-screen flex flex-col bg-[#f2f6fbff]">
    <Header />
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 p-4">{children}</main>
    </div>
    <Footer />
  </div>
);

}
