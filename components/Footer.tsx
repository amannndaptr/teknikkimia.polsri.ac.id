import Link from "next/link";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa"; // Removed FaTwitter and FaXTwitter from here
import { FaXTwitter } from "react-icons/fa6"; // Import FaXTwitter from fa6

export default function Footer() {
    return (
        <footer className="bg-[#800000] text-white py-4 mt-0">
            <div className="container mx-auto px-6 md:px-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">

                    {/* Informasi Kontak */}
                    <div>
                        <h2 className="text-2xl font-bold text-yellow-300">Kontak Kami</h2>
                        <p className="mt-2 text-gray-300 flex items-center gap-2">
                            📍 Teknik Kimia, Politeknik Negeri Sriwijaya
                        </p>
                        <p className="mt-2 text-gray-300 flex items-center gap-2">
                            📞 (0711) 353414
                        </p>
                        <p className="mt-2 text-gray-300 flex items-center gap-2">
                            ✉️ kimia@polsri.ac.id
                        </p>
                    </div>

                    {/* Sosial Media */}
                    <div>
                        <h2 className="text-2xl font-bold text-yellow-300">Ikuti Kami</h2>
                        <div className="flex justify-center md:justify-start space-x-4 mt-4">
                            <Link href="https://www.facebook.com" target="_blank" className="text-white text-2xl hover:text-yellow-300 transition-colors">
                                <FaFacebook />
                            </Link>
                            <Link href="https://www.instagram.com/hmjteknikkimiapolsri?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" className="text-white text-2xl hover:text-yellow-300 transition-colors">
                                <FaInstagram />
                            </Link>
                            <Link href="https://x.com/tekimpolsri" target="_blank" className="text-white text-2xl hover:text-yellow-300 transition-colors">
                                <FaXTwitter />
                            </Link>
                        </div>
                    </div>

                    {/* Lokasi / Google Maps */}
                    <div>
                        <h2 className="text-2xl font-bold text-yellow-300">Lokasi Kami</h2>
                        <div className="mt-4 overflow-hidden rounded-lg shadow-lg">
                            <iframe
                                title="Teknik Kimia POLSRI"
                                className="w-full h-40 rounded-lg"
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1522.603159681809!2d104.73277886285707!3d-2.9829373762835782!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e3b758772026c65%3A0x9cfcb0ccb7df45a5!2sTeknik%20Kimia%20Polsri!5e0!3m2!1sen!2sus!4v1747882782349!5m2!1sen!2sus"
                                frameBorder="0"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            ></iframe>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="text-center text-sm mt-10 border-t border-yellow-400 pt-4 text-gray-300">
                    &copy; {new Date().getFullYear()} Teknik Kimia POLSRI.
                </div>
            </div>
        </footer>
    );
}
