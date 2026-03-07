import React, { useState } from "react";

interface LoginProps {
    onLogin: (email: string, password: string) => void;
}

const LoginPage: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(email, password);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-pink-100">
            <div className="bg-white p-10 rounded-xl shadow-xl w-[400px]">
                <h2 className="text-2xl font-bold text-center mb-6">Login</h2>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                    <input
                        type="email"
                        placeholder="Email"
                        className="border p-3 rounded-lg"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        className="border p-3 rounded-lg"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button
                        type="submit"
                        className="bg-pink-500 text-white p-3 rounded-lg hover:bg-pink-600"
                    >
                        Login
                    </button>

                </form>
            </div>
        </div>
    );
};

export default LoginPage;