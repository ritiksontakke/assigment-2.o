import React from "react";
import ProductItem from "./ProductItem";

const products = [
    { name: "Custom Video or Product", price: 9.99, image: "path/to/image" },
    { name: "Consulting", price: 9.99, image: "path/to/image" },
    // Add more products as needed
];

const ProductList = () => {
    return (
        <div className="p-4">
            {products.map((product, index) => (
                <ProductItem product={product} key={index} />
            ))}
        </div>
    );
};

export default ProductList;
