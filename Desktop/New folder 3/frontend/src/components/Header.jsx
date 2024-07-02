import React from "react";

const Header = () => {
    return (
        <div className="bg-yellow-100 p-4 text-center">
            <p>
                Your store isn't live yet. No worries! You can renew your
                subscription{" "}
                <a href="#" className="text-blue-500">
                    here
                </a>
                .
            </p>
        </div>
    );
};

export default Header;
