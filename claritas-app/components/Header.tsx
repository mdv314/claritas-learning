"use client";
import { useRouter } from "next/navigation";
import Image from 'next/image'
import logo from "../app/claritas-logo.png"

const Header = () => {
    const router = useRouter();

    const onNavigate = (path: string) => {
        router.push(path);
    };

    return (
        <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/40 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 flex justify-between items-center h-20">
                <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => onNavigate("/")}
                >
                    <div className="relative">
                        <Image
                            src={logo}
                            width={90}
                            height={90}
                            alt="Logo for Claritas"
                            className="flex mr-[-1rem]"
                        />
                    </div>

                    <span className="text-2xl font-black tracking-tighter text-white">
                        Claritas{" "}
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-400">
                            Learning
                        </span>
                    </span>
                </div>


            </div>
        </nav>
    );
};

export default Header;
