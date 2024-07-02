// App.js
import React from "react";
import Sidebar from "./components/SideBar";
import Header from "./components/Header";
import ProductList from "./components/ProductList";
import StoreDetails from "./components/StoreDetails";

function App() {
    return (
        <div className="flex">
            <Sidebar />
            <div className="flex-1">
                <Header />
                <div className="flex p-4">
                    <div className="w-2/3">
                        <StoreDetails />
                        <ProductList />
                    </div>
                    <div className="w-1/3 bg-gray-100 p-4 rounded">
                        <div className="flex flex-col items-center">
                            <img
                                src="path/to/image"
                                alt="Store"
                                className="w-full h-64 object-cover rounded mb-4"
                            />
                            <h2 className="text-xl">Name</h2>
                            <p className="text-gray-500 text-center">
                                Lorem Ipsum is simply dummy text of the printing
                                and typesetting industry.
                            </p>
                            <div className="flex space-x-2 mt-4">
                                <a href="#">
                                    <i className="fab fa-tiktok"></i>
                                </a>
                                <a href="#">
                                    <i className="fab fa-instagram"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
