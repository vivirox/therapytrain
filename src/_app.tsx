import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Todo {
    id: number;
    title: string;
    completed: boolean;
}

const Page: React.FC = () => {
    const [todos, setTodos] = useState<Array<Todo>>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const getTodos = async () => {
            try {
                const { data: todos, error } = await supabase.from('todos').select();
                if (error) {
                  throw error;
                }
                setTodos(todos || []);
            } catch (error) {
                console.error('Error fetching todos:', error);
            } finally {
                setLoading(false);
            }
        };

        getTodos();
    }, []);

    return (
        <ul>
            {loading ? (
                <p>Loading...</p>
            ) : (
                todos.map((todo: any) => (
                    <li key={todo.id}>{todo.title}</li>
                ))
            )}
        </ul>
    );
}
export default Page

import { supabase } from '@/lib/supabase'

interface Todo {
    id: number;
    title: string;
    completed: boolean;
}

const Page: React.FC = () => {
    const [todos, setTodos] = useState<Array<Todo>>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const getTodos = async () => {
            try {
                const { data: todos, error } = await supabase.from('todos').select();
                if (error) {
                  throw error;
                }
                setTodos(todos || []);
            } catch (error) {
                console.error('Error fetching todos:', error);
            } finally {
                setLoading(false);
            }
        };

        getTodos();
    }, []);

    return (
        <ul>
            {loading ? (
                <p>Loading...</p>
            ) : (
                todos.map((todo: any) => (
                    <li key={todo.id}>{todo.title}</li>
                ))
            )}
        </ul>
    );
}
export default Page
