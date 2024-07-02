import React from "react";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";

const StoreDetails = () => {
    return (
        <div className="p-4">
            <div>
                <div className="mb-2">
                    <Button
                        variant="contained"
                        className="bg-indigo-600 text-white px-8 py-3"
                    >
                        Store
                    </Button>
                    <Button className="bg-indigo-600 text-white px-8 py-3">
                        Landing Page
                    </Button>
                    <Button className="bg-indigo-600 text-white px-8 py-3">
                        Edit Design
                    </Button>
                </div>
            </div>
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                <div className="flex items-center px-4 py-2 border-b border-gray-200">
                    <Avatar alt={"name"} src="/avatar.jpg" />{" "}
                    <div className="ml-4">
                        <Typography variant="h6">{"name"}</Typography>
                        <Typography variant="body2" color="textSecondary">
                            @{"username"}
                        </Typography>
                    </div>
                </div>
                {"mediaUrl" && (
                    <img
                        src={"mediaUrl"}
                        alt="Tweet media"
                        className="w-full h-auto object-cover"
                    />
                )}
                <div className="px-4 py-2">{/* Content area for text */}</div>
            </div>
        </div>
    );
};

export default StoreDetails;
