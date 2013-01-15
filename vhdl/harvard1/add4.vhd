library IEEE;
use IEEE.STD_LOGIC_1164.ALL;
--use IEEE.NUMERIC_STD.ALL;

entity add4 is
    Port ( a,b: in  STD_LOGIC_VECTOR (3 downto 0);
           ci : in  STD_LOGIC;
           q  : out STD_LOGIC_VECTOR (3 downto 0);
           co : out STD_LOGIC);
end add4;

architecture Behavioral of add4 is
    signal c0,c1,c2 : std_logic := '0';
begin
    -- 1st
    q(0) <= a(0) xor b(0) xor ci;  -- sum
    c0   <= (a(0) and b(0)) or (ci and (a(0) or b(0)));  -- carry
    
    -- 2nd
    q(1) <=  a(1) xor b(1) xor c0;
    c1   <= (a(1) and b(1)) or (c0 and (a(1) or b(1)));
    
    -- 3rd
    q(2) <=  a(2) xor b(2) xor c1;
    c2   <= (a(2) and b(2)) or (c1 and (a(2) or b(2)));
    
    -- 4th
    q(3) <=  a(3) xor b(3) xor c2;
    co   <= (a(3) and b(3)) or (c2 and (a(3) or b(3)));
end Behavioral;
