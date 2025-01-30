// src/components/TodoApp.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

interface Todo {
    id: number;
    title: string;
    completed: boolean;
}

interface StyleSheet {
    [key: string]: React.CSSProperties;
}

const styles: StyleSheet = {
    container: {
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
    },
    header: {
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '20px',
        textAlign: 'center',
    },
    todoList: {
        listStyle: 'none',
        padding: 0,
    },
    todoItem: {
        padding: '10px',
        margin: '5px 0',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
    }
};

export const TodoApp: React.FC = () => {
    const [todos, setTodos] = useState<Array<Todo>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTodos = async () => {
            try {
                const { data, error } = await supabase
                    .from('todos')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) {
                    throw error;
                }

                setTodos(data || []);
            } catch (err) {
                setError(err.message);
                console.error('Error fetching todos:', err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTodos();
    }, []);

    if (loading) {
        return <div style={styles.container}>Loading todos...</div>;
    }

    if (error) {
        return <div style={styles.container}>Error: {error}</div>;
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Todo List</h1>
            <ul style={styles.todoList}>
                {todos.map((todo) => (
                    <li key={todo.id} style={styles.todoItem}>
                        <span>{todo.title}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default TodoApp;