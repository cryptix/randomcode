#include <unistd.h>
#include <stdlib.h>
#include <stdio.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <strings.h>
#include <string.h>
#include <arpa/inet.h>
 
int main(void) {
        /* Socket erstellen - TCP, IPv4, keine Optionen */
        int lsd = socket(AF_INET, SOCK_STREAM, 0);
        if(lsd == -1)
          return 1; /* ERROR */
 
        /* IPv4, Port: 1111, jede IP-Adresse akzeptieren */
        struct sockaddr_in saddr;
        saddr.sin_family = AF_INET;
        saddr.sin_port = htons(1111);
        saddr.sin_addr.s_addr = htons(INADDR_ANY);
 
        /* Socket an Port binden */
        if(bind(lsd, (struct sockaddr*) &saddr, sizeof(saddr)) == -1) 
          return 1; /* ERROR */
 
        /* Auf Socket horchen (Listen) */
        if(listen(lsd, 10) == -1)
          return 1; /* ERROR */
 
        for(;;) {
                /* Puffer und Strukturen anlegen */
                int bytes;
                struct sockaddr_in clientaddr;
                char bufSend[512];
                char bufRecv[512];
                bzero(bufSend, sizeof(bufSend));
                bzero(bufRecv, sizeof(bufRecv));
 
                /* Auf Verbindung warten, bei Verbindung Connected-Socket erstellen */
                socklen_t clen = sizeof(clientaddr);
                int csd = accept(lsd, (struct sockaddr*) &clientaddr, &clen);
                if(csd == -1)
                  break; /* ERROR > next client */
 
                /* Client bedienen solange gelesen werden kann */
                while( (bytes = recv(csd, bufRecv, sizeof(bufRecv), 0)) > 0 ) {

                  printf("Der Client hat folgenden String gesendet: %s\n", bufRecv);
                  printf("Es wurden %d Bytes empfangen\n", bytes);

                  /* zum Clienten senden */
                  strncpy(bufSend, "iWelcome\n", sizeof(bufSend));
                  bytes = send(csd, bufSend, strlen(bufSend), 0);
                  printf("Es wurden %d Bytes gesendet\n", bytes);
   
                  strncpy(bufSend, "iNiceNice\n", sizeof(bufSend));
                  bytes = send(csd, bufSend, strlen(bufSend), 0);
                  printf("Es wurden %d Bytes gesendet\n", bytes);

                  bzero(bufSend, sizeof(bufSend));
                  bzero(bufRecv, sizeof(bufRecv));
                }
                /* Verbindung schließen */
                close(csd);
        }
 
        return EXIT_SUCCESS;
 
}
