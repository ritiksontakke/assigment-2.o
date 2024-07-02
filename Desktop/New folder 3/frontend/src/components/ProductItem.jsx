import React from "react";

const ProductItem = ({ product }) => {
    return (
        <div className="flex items-center justify-between p-4 bg-white shadow rounded mb-4">
            <div className="flex items-center">
                <img
                    src={product.image}
                    alt={product.name}
                    className="w-16 h-16 rounded mr-4"
                />
                <div>
                    <h3 className="text-lg">{product.name}</h3>
                    <p className="text-gray-500">${product.price}</p>
                </div>
            </div>
        </div>
    );
};

export default ProductItem;
