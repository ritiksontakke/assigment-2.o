import React, { useState } from "react";
import { List, ListItem, ListItemText, ListItemIcon } from "@mui/material";
import HomeIcon from '@mui/icons-material/Home';
import StoreIcon from '@mui/icons-material/Store';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleIcon from '@mui/icons-material/People';
import MoreIcon from '@mui/icons-material/More';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

const Sidebar = () => {
    const [activeTab, setActiveTab] = useState("My Store");

    const handleTabClick = (tab) => {
        setActiveTab(tab);
    };

    const menuItems = [
        { text: "Home", icon: <HomeIcon /> },
        { text: "My Store", icon: <StoreIcon /> },
        { text: "Income", icon: <AttachMoneyIcon /> },
        { text: "Analytics", icon: <BarChartIcon /> },
        { text: "Customers", icon: <PeopleIcon /> },
        { text: "More", icon: <MoreIcon /> },
    ];

    const bottomItems = [
        { text: "Ask", icon: <QuestionAnswerIcon /> },
        { text: "Settings", icon: <SettingsIcon /> },
        { text: "Rohit045", icon: <AccountCircleIcon /> },
    ];

    return (
        <div className="w-64 bg-gray-100 h-screen p-4 flex flex-col justify-between">
            <List>
                {menuItems.map(({ text, icon }) => (
                    <ListItem
                        button
                        key={text}
                        onClick={() => handleTabClick(text)}
                        className={`flex items-center mb-2 ${
                            activeTab === text
                                ? "bg-blue-600 text-white rounded-lg"
                                : "text-black"
                        }`}
                    >
                        <ListItemIcon className={activeTab === text ? "text-white" : "text-black"}>
                            {icon}
                        </ListItemIcon>
                        <ListItemText primary={text} />
                    </ListItem>
                ))}
            </List>
            <List>
                {bottomItems.map(({ text, icon }) => (
                    <ListItem
                        button
                        key={text}
                        onClick={() => handleTabClick(text)}
                        className={`flex items-center mb-2 ${
                            activeTab === text
                                ? "bg-blue-600 text-white rounded-lg"
                                : "text-black"
                        }`}
                    >
                        <ListItemIcon className={activeTab === text ? "text-white" : "text-black"}>
                            {icon}
                        </ListItemIcon>
                        <ListItemText primary={text} />
                    </ListItem>
                ))}
            </List>
        </div>
    );
};

export default Sidebar;
