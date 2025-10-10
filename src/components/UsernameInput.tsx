import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface UsernameInputProps {
  currentUsername: string;
  onChange?: (username: string) => void;
  disabled?: boolean;
  allowEdit?: boolean;
}

export function UsernameInput({ currentUsername, onChange, disabled = false, allowEdit = false }: UsernameInputProps) {
  const [username, setUsername] = useState(currentUsername);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setUsername(currentUsername);
  }, [currentUsername]);

  useEffect(() => {
    if (username === currentUsername || username.length < 3 || disabled) {
      setAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id')                 // we only need to know if *any* row exists
          .eq('username', username.toLowerCase());

        setAvailable(data.length === 0);
      } catch (error) {
        // Type-safe error handling for Supabase errors
        const supabaseError = error as { code?: string; details?: string };
        if (supabaseError.code === 'PGRST116' || supabaseError.details?.includes('No rows found')) {
          setAvailable(true);
        } else {
          console.error('Error checking username availability:', error);
          setAvailable(false);
        }
      } finally {
        setChecking(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username, currentUsername, disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    setUsername(value);
    onChange?.(value);
  };

  return (
    <div>
      <input
        type="text"
        value={username}
        onChange={handleChange}
        disabled={disabled}
        placeholder="username"
        maxLength={20}
        className="w-full p-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {!disabled && (
        <>
          {checking && (
            <p className="text-sm text-muted-foreground mt-1">Checking availability...</p>
          )}
          {available === true && (
            <p className="text-sm text-green-500 mt-1">✓ Username available</p>
          )}
          {available === false && (
            <p className="text-sm text-red-500 mt-1">✗ Username not available</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            3-20 characters, letters and numbers only
          </p>
        </>
      )}
    </div>
  );
}
