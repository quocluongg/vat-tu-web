import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import getDb from './db';

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                const db = getDb();
                const user = db.prepare('SELECT * FROM users WHERE username = ?').get(credentials.username);

                if (user && bcrypt.compareSync(credentials.password, user.password_hash)) {
                    return {
                        id: user.id.toString(),
                        name: user.ho_ten,
                        username: user.username,
                    };
                }
                return null;
            }
        })
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.username = user.username;
            }
            return token;
        },
        async session({ session, token }) {
            session.user.id = token.id;
            session.user.username = token.username;
            return session;
        }
    },
    pages: {
        signIn: '/',
    },
    secret: process.env.NEXTAUTH_SECRET || 'vattu-secret-key-change-in-production',
};
