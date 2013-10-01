;--------------- PRELIMINARY SETUP ---------------;

[BITS 16]		; Tell NASM we're in 16-bit mode
[ORG 0x7C00]		; Tell NASM that this code will be loaded at 0x7C00
			; to ensure any absolute jumps are calculated correctly

;---------------- BOOTLOADER CODE ----------------;

MOV SI, HelloString	; Store pointer to hello world string in SI
CALL PrintString	; Print the string
HLT			; Stop the processor

;---------------- SCREEN FUNCTIONS ---------------;

PrintString:		; Print a string to screen
			; Assume pointer to string to print is in SI
next_character:
MOV AL, [SI]		; Grab the next character
OR AL, AL		; Check if character is zero
JZ exit_function	; If it is, then return
CALL PrintCharacter	; Else, print the character
INC SI			; Increment pointer for next character
JMP next_character	; Loop
exit_function:
RET

PrintCharacter:		; Print a single character to screen
			; Assume character to print is in AL
MOV AH, 0x0E		; Teletype Mode
MOV BH, 0x00		; Page zero
MOV BL, 0x07		; Light Gray
INT 0x10		; Print Character
RET

;------------------ DATA BLOCK ------------------;

HelloString db 'Hello World', 0

;-------------- PADDING / SIGNATURE -------------;

; $ is current line, $$ is first line, db 0 is a 00000000 byte
; So, pad the code with 0s until you reach 510 bytes
TIMES 510 - ($ - $$) DB 0

; Fill last two bytes (a word) with the MBR signature 0xAA55
DW 0xAA55