library IEEE;
use IEEE.STD_LOGIC_1164.ALL;

entity add4_tb is
end add4_tb;

architecture behav of add4_tb is
  --  Declaration of the component that will be instantiated.
  
  component add4
        Port ( a,b: in  STD_LOGIC_VECTOR (3 downto 0);
               ci : in  STD_LOGIC;
               q  : out STD_LOGIC_VECTOR (3 downto 0);
               co : out STD_LOGIC);
  end component;
  
  --  Specifies which entity is bound with the component.
  for adder_4: add4 use entity work.add4;
  
  signal a, b, q : STD_LOGIC_VECTOR (3 downto 0);
  signal ci, co  : STD_LOGIC;

begin
  --  Component instantiation.
  adder_4: add4 port map (a,b, ci, q, co);

  --  This process does the real job.
  process
     type pattern_type is record
        --  The inputs of the adder.
        a, b : STD_LOGIC_VECTOR (3 downto 0);
        ci   : STD_LOGIC;
        --  The expected outputs of the adder.
        q  : STD_LOGIC_VECTOR (3 downto 0);
        co : STD_LOGIC;
     end record;
     --  The patterns to apply.
     type pattern_array is array (natural range <>) of pattern_type;
     constant patterns : pattern_array :=
       (("0000", "0000", '0', "0000", '0'),
        ("0000", "0000", '1', "0001", '0'),
        ("0000", "0001", '0', "0001", '0'),
        ("0001", "0000", '0', "0001", '0'));
  begin
     --  Check each pattern.
     for i in patterns'range loop
        --  Set the inputs.
        a <= patterns(i).a;
        b <= patterns(i).b;
        ci <= patterns(i).ci;
        --  Wait for the results.
        wait for 1 ns;
        --  Check the outputs.
        assert q = patterns(i).q
           report "bad sum value" severity error;
        assert co = patterns(i).co
           report "bad carray out value" severity error;
     end loop;
     assert false report "end of test" severity note;
     --  Wait forever; this will finish the simulation.
     wait;
  end process;

end behav;