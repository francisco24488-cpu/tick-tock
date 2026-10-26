import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RegistroService {
  private jsonUrl = 'data/registros.json';

  constructor(private http: HttpClient) {}

  getDatosIniciales(): Observable<any> {
    return this.http.get<any>(this.jsonUrl);
  }
}